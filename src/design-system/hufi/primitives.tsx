import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from "react";
import styles from "@/styles/hufi/primitives.module.css";
import { cn } from "@/lib/utils";
export function HufiSurface({className,raised=true,...props}:HTMLAttributes<HTMLDivElement>&{raised?:boolean}){return <div className={cn(styles.surface,!raised&&styles.surfaceFlat,className)} {...props}/>}
export function HufiPanel({className,...props}:HTMLAttributes<HTMLDivElement>){return <HufiSurface className={cn(styles.panel,className)} {...props}/>}
export function HufiButton({className,variant="primary",...props}:ButtonHTMLAttributes<HTMLButtonElement>&{variant?:"primary"|"secondary"|"quiet"}){return <button className={cn(styles.button,styles[variant],className)} {...props}/>}
export function HufiIconButton({className,...props}:ButtonHTMLAttributes<HTMLButtonElement>){return <button className={cn(styles.iconButton,className)} {...props}/>}
export function HufiStatusBadge({className,tone="neutral",children}:{className?:string;tone?:"success"|"warning"|"danger"|"neutral";children:ReactNode}){return <span className={cn(styles.badge,styles[tone],className)}>{children}</span>}
export function HufiTile({className,icon,title,description,...props}:ButtonHTMLAttributes<HTMLButtonElement>&{icon:ReactNode;title:string;description?:string}){return <button className={cn(styles.tile,className)} {...props}><span className={styles.tileIcon}>{icon}</span><span><span className={styles.tileTitle}>{title}</span>{description&&<span className={styles.tileDescription}>{description}</span>}</span></button>}
export function HufiSheet({className,title,children}:{className?:string;title:string;children:ReactNode}){return <div className={cn(styles.sheetBackdrop,className)}><section className={styles.sheet} aria-label={title}><div className={styles.sheetHandle}/><strong>{title}</strong><div style={{marginTop:12}}>{children}</div></section></div>}
