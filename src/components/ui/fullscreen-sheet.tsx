import * as React from "react";
import { Drawer as DrawerPrimitive } from "vaul";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

const FullscreenSheet = ({
  shouldScaleBackground = true,
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Root>) => (
  <DrawerPrimitive.Root
    shouldScaleBackground={shouldScaleBackground}
    {...props}
  />
);
FullscreenSheet.displayName = "FullscreenSheet";

const FullscreenSheetTrigger = DrawerPrimitive.Trigger;

const FullscreenSheetPortal = DrawerPrimitive.Portal;

const FullscreenSheetClose = DrawerPrimitive.Close;

const FullscreenSheetOverlay = React.forwardRef<
  React.ElementRef<typeof DrawerPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DrawerPrimitive.Overlay
    ref={ref}
    className={cn("fixed inset-0 z-50 bg-black/80", className)}
    {...props}
  />
));
FullscreenSheetOverlay.displayName = "FullscreenSheetOverlay";

interface FullscreenSheetContentProps
  extends React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Content> {
  showDragHandle?: boolean;
}

const FullscreenSheetContent = React.forwardRef<
  React.ElementRef<typeof DrawerPrimitive.Content>,
  FullscreenSheetContentProps
>(({ className, children, showDragHandle = true, ...props }, ref) => (
  <FullscreenSheetPortal>
    <FullscreenSheetOverlay />
    <DrawerPrimitive.Content
      ref={ref}
      className={cn(
        "fixed inset-x-0 bottom-0 z-50 mt-24 flex h-[95vh] flex-col rounded-t-[20px] bg-background",
        "focus:outline-none",
        className
      )}
      {...props}
    >
      {/* Drag Handle */}
      {showDragHandle && (
        <div className="mx-auto flex h-6 w-full max-w-md items-center justify-center pt-2">
          <div className="h-1.5 w-12 rounded-full bg-muted-foreground/30" />
        </div>
      )}
      {/* Close Button */}
      <DrawerPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-secondary z-10">
        <X className="h-5 w-5" />
        <span className="sr-only">Close</span>
      </DrawerPrimitive.Close>
      {children}
    </DrawerPrimitive.Content>
  </FullscreenSheetPortal>
));
FullscreenSheetContent.displayName = "FullscreenSheetContent";

const FullscreenSheetHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "sticky top-0 z-10 bg-background px-4 pb-3 pt-2 border-b border-border",
      className
    )}
    {...props}
  />
);
FullscreenSheetHeader.displayName = "FullscreenSheetHeader";

const FullscreenSheetFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "sticky bottom-0 z-10 bg-background px-4 py-4 border-t border-border mt-auto",
      "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 gap-2 sm:gap-0",
      // Safe area padding for iOS devices
      "pb-[calc(1rem+env(safe-area-inset-bottom))]",
      className
    )}
    {...props}
  />
);
FullscreenSheetFooter.displayName = "FullscreenSheetFooter";

const FullscreenSheetTitle = React.forwardRef<
  React.ElementRef<typeof DrawerPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DrawerPrimitive.Title
    ref={ref}
    className={cn(
      "text-lg font-semibold leading-none tracking-tight",
      className
    )}
    {...props}
  />
));
FullscreenSheetTitle.displayName = "FullscreenSheetTitle";

const FullscreenSheetDescription = React.forwardRef<
  React.ElementRef<typeof DrawerPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DrawerPrimitive.Description
    ref={ref}
    className={cn("text-sm text-muted-foreground mt-1", className)}
    {...props}
  />
));
FullscreenSheetDescription.displayName = "FullscreenSheetDescription";

const FullscreenSheetBody = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex-1 overflow-y-auto px-4 py-4",
      // Ensure 16px+ font sizes for inputs (prevents iOS zoom)
      "[&_input]:text-base [&_textarea]:text-base [&_select]:text-base",
      className
    )}
    {...props}
  />
);
FullscreenSheetBody.displayName = "FullscreenSheetBody";

export {
  FullscreenSheet,
  FullscreenSheetPortal,
  FullscreenSheetOverlay,
  FullscreenSheetTrigger,
  FullscreenSheetClose,
  FullscreenSheetContent,
  FullscreenSheetHeader,
  FullscreenSheetBody,
  FullscreenSheetFooter,
  FullscreenSheetTitle,
  FullscreenSheetDescription,
};
