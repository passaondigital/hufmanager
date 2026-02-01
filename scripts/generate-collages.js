#!/usr/bin/env node
/*
  Node script to process pending collage_jobs and generate collages using sharp.

  Usage (run once):
    SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/generate-collages.js

  Usage (daemon):
    WORKER_MODE=daemon POLL_INTERVAL_MS=60000 SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/generate-collages.js
*/

const { createClient } = require('@supabase/supabase-js');
const sharp = require('sharp');

// Optional telemetry
let Sentry;
if (process.env.SENTRY_DSN) {
  Sentry = require('@sentry/node');
  Sentry.init({ dsn: process.env.SENTRY_DSN });
}

// Prometheus metrics (optional)
const client = require('prom-client');
const collectDefaultMetrics = client.collectDefaultMetrics;
collectDefaultMetrics({ timeout: 5000 });
const processedJobs = new client.Counter({ name: 'collage_jobs_processed_total', help: 'Total processed jobs' });
const failedJobs = new client.Counter({ name: 'collage_jobs_failed_total', help: 'Total failed jobs' });
const jobDuration = new client.Histogram({ name: 'collage_job_duration_seconds', help: 'Duration of job processing', buckets: [0.5, 1, 2, 5, 10, 30, 60] });
const lastRun = new client.Gauge({ name: 'collage_worker_last_run_timestamp', help: 'Last run timestamp (epoch seconds)' });

const MAX_JOBS_PER_RUN = Number(process.env.MAX_JOBS_PER_RUN || 5);
const POLL_INTERVAL_MS = Number(process.env.POLL_INTERVAL_MS || 60_000);
const MAX_BACKOFF_MS = Number(process.env.MAX_BACKOFF_MS || 5 * 60_000);
const WORKER_MODE = process.env.WORKER_MODE || 'run-once'; // 'run-once' or 'daemon'

function sleep(ms) { return new Promise((res) => setTimeout(res, ms)); }

async function processJobsOnce(supabase) {
  // Fetch up to N pending jobs
  const { data: jobs, error: jobsError } = await supabase
    .from('collage_jobs')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
    .limit(MAX_JOBS_PER_RUN);

  if (jobsError) {
    throw new Error(`Failed to fetch jobs: ${jobsError.message || jobsError}`);
  }

  if (!jobs || jobs.length === 0) return 0;

  for (const job of jobs) {
    console.log('Processing job', job.id, job.horse_id, job.position);
    // mark processing
    await supabase.from('collage_jobs').update({ status: 'processing' }).eq('id', job.id);

    try {
      // fetch latest 4 non-collage photos for horse+position
      const { data: photos, error: photosError } = await supabase
        .from('hoof_photos')
        .select('*')
        .eq('horse_id', job.horse_id)
        .eq('hoof_position', job.position)
        .not('notes', 'eq', 'collage')
        .order('created_at', { ascending: false })
        .limit(4);

      if (photosError) throw photosError;
      if (!photos || photos.length < 4) {
        console.log('Not enough photos for job', job.id);
        await supabase.from('collage_jobs').update({ status: 'failed', error: 'Not enough photos' }).eq('id', job.id);
        continue;
      }

      // For each photo, create a signed URL for download
      const signedUrls = await Promise.all(photos.map(async (p) => {
        // use file_path if present
        const filePath = p.file_path || p.photo_url;
        const { data } = await supabase.storage.from('hoof_photos').createSignedUrl(filePath, 60);
        return data?.signedUrl;
      }));

      // download buffers
      const buffers = await Promise.all(signedUrls.map(async (url) => {
        const res = await fetch(url);
        if (!res.ok) throw new Error('Failed to download image');
        return await res.arrayBuffer();
      }));

      // composite 2x2 using sharp
      const size = 2048;
      const half = size / 2;

      // prepare resized images
      const imgs = await Promise.all(buffers.map(async (buf) => {
        return await sharp(Buffer.from(buf)).resize(half, half, { fit: 'cover' }).toBuffer();
      }));

      // create blank canvas
      const canvas = sharp({ create: { width: size, height: size, channels: 3, background: '#ffffff' } });
      const composites = [];
      for (let i = 0; i < 4; i++) {
        const x = (i % 2) * half;
        const y = Math.floor(i / 2) * half;
        composites.push({ input: imgs[i], left: x, top: y });
      }

      const collageBuffer = await canvas.composite(composites).jpeg({ quality: 90 }).toBuffer();

      const filename = `collage_${job.horse_id}_${job.position}_${Date.now()}.jpg`;
      const path = `hoof_photos/collages/${filename}`;

      // upload
      const { error: uploadErr } = await supabase.storage.from('hoof_photos').upload(path, collageBuffer, { upsert: true });
      if (uploadErr) throw uploadErr;

      const { data: urlData } = supabase.storage.from('hoof_photos').getPublicUrl(path);
      const publicUrl = urlData.publicUrl;

      // insert hoof_photos record
      const { error: insertErr } = await supabase.from('hoof_photos').insert({
        horse_id: job.horse_id,
        photo_url: publicUrl,
        file_path: path,
        hoof_position: job.position,
        notes: 'collage',
        taken_at: new Date().toISOString(),
      });

      if (insertErr) throw insertErr;

      // mark job done
      await supabase.from('collage_jobs').update({ status: 'done', processed_at: new Date().toISOString(), result_file_path: path }).eq('id', job.id);

      console.log('Job completed', job.id);
      processedJobs.inc();
    } catch (err) {
      console.error('Job failed', job.id, err);
      failedJobs.inc();
      if (Sentry) Sentry.captureException(err);
      await supabase.from('collage_jobs').update({ status: 'failed', error: String(err) }).eq('id', job.id);
    }
  }

  return jobs.length;
}

async function runDaemon(supabase) {
  const METRICS_PORT = Number(process.env.METRICS_PORT || 9464);
  console.log('Starting daemon worker: poll interval', POLL_INTERVAL_MS, 'ms, metrics on', METRICS_PORT);

  // Start metrics HTTP endpoint
  const http = require('http');
  const server = http.createServer(async (req, res) => {
    if (req.url === '/metrics') {
      res.setHeader('Content-Type', client.register.contentType);
      res.end(await client.register.metrics());
    } else {
      res.statusCode = 200;
      res.end('ok');
    }
  });
  server.listen(METRICS_PORT);

  let backoff = 1000;
  let stopped = false;

  process.on('SIGINT', () => { stopped = true; console.log('SIGINT received, stopping...'); });
  process.on('SIGTERM', () => { stopped = true; console.log('SIGTERM received, stopping...'); });

  while (!stopped) {
    try {
      const start = Date.now();
      const processed = await processJobsOnce(supabase);
      const dur = (Date.now() - start) / 1000;
      jobDuration.observe(dur);
      lastRun.set(Math.floor(Date.now() / 1000));

      if (processed === 0) {
        // no work, regular sleep
        await sleep(POLL_INTERVAL_MS);
      } else {
        // work done, continue immediately
      }
      backoff = 1000; // reset
    } catch (err) {
      console.error('Daemon error, backing off', err);
      if (Sentry) Sentry.captureException(err);
      await sleep(backoff);
      backoff = Math.min(backoff * 2, MAX_BACKOFF_MS);
    }
  }

  server.close();
  console.log('Daemon exiting');
}

async function main() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  if (WORKER_MODE === 'daemon') {
    await runDaemon(supabase);
  } else {
    await processJobsOnce(supabase);
  }
}

main().catch(err => { console.error(err); process.exit(1); });