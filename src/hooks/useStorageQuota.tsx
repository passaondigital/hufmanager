import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export type EntityType = "provider" | "client" | "horse";

export interface StorageQuotaInfo {
  allowed: boolean;
  current_usage: number;
  quota_limit: number;
  max_file_size: number;
  remaining: number;
  file_size: number;
  would_exceed_quota: boolean;
  exceeds_max_file_size: boolean;
}

// Storage quota limits in bytes
export const STORAGE_QUOTAS = {
  provider: {
    total: 10 * 1024 * 1024 * 1024, // 10 GB
    maxFileSize: 50 * 1024 * 1024,   // 50 MB
    label: "Hufbearbeiter",
  },
  client: {
    total: 1 * 1024 * 1024 * 1024,   // 1 GB
    maxFileSize: 20 * 1024 * 1024,   // 20 MB
    label: "Kunde",
  },
  horse: {
    total: 500 * 1024 * 1024,        // 500 MB
    maxFileSize: 10 * 1024 * 1024,   // 10 MB
    label: "Pferdeakte",
  },
} as const;

export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return "0 Bytes";
  
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
}

export function useStorageQuota(entityType: EntityType, entityId: string | null) {
  const { user } = useAuth();

  const { data: usage, isLoading, refetch } = useQuery({
    queryKey: ["storage-usage", entityType, entityId],
    queryFn: async () => {
      if (!entityId) return null;
      
      const { data, error } = await supabase
        .rpc("get_storage_usage", {
          p_entity_type: entityType,
          p_entity_id: entityId,
        });
      
      if (error) throw error;
      
      const quota = STORAGE_QUOTAS[entityType];
      return {
        used: data || 0,
        total: quota.total,
        remaining: quota.total - (data || 0),
        maxFileSize: quota.maxFileSize,
        percentUsed: ((data || 0) / quota.total) * 100,
      };
    },
    enabled: !!entityId && !!user?.id,
  });

  const checkQuota = async (fileSize: number): Promise<StorageQuotaInfo | null> => {
    if (!entityId) return null;
    
    const { data, error } = await supabase
      .rpc("check_storage_quota", {
        p_entity_type: entityType,
        p_entity_id: entityId,
        p_file_size_bytes: fileSize,
      });
    
    if (error) throw error;
    return data as unknown as StorageQuotaInfo;
  };

  const trackUpload = async (
    bucketName: string,
    filePath: string,
    fileSize: number
  ) => {
    if (!entityId || !user?.id) return;
    
    const { error } = await supabase
      .from("storage_usage")
      .insert({
        entity_type: entityType,
        entity_id: entityId,
        bucket_name: bucketName,
        file_path: filePath,
        file_size_bytes: fileSize,
        uploaded_by: user.id,
      });
    
    if (error) throw error;
    refetch();
  };

  const removeUpload = async (bucketName: string, filePath: string) => {
    const { error } = await supabase
      .from("storage_usage")
      .delete()
      .eq("bucket_name", bucketName)
      .eq("file_path", filePath);
    
    if (error) throw error;
    refetch();
  };

  return {
    usage,
    isLoading,
    refetch,
    checkQuota,
    trackUpload,
    removeUpload,
    quota: STORAGE_QUOTAS[entityType],
  };
}

// Simplified hook for current user's quota
export function useMyStorageQuota() {
  const { user, role } = useAuth();
  const entityType: EntityType = role === "provider" ? "provider" : "client";
  
  return useStorageQuota(entityType, user?.id || null);
}