"use client"

import * as React from "react"
import * as SelectPrimitive from "@radix-ui/react-select"
import { Check, ChevronDown, ChevronUp } from "lucide-react"
import { Drawer } from "vaul"

import { cn } from "@/lib/utils"
import { useIsMobile } from "@/hooks/use-mobile"

// الجذر الداخلي — يُستخدم على سطح المكتب فقط. التصدير العام أسفل الملف
// يغلّفه ببديل الجوال (لوحة سفلية Vaul) فلا يبقى أي قائمة منسدلة قياسية على الجوال.
const SelectRoot = SelectPrimitive.Root

const SelectGroup = SelectPrimitive.Group

const SelectValue = SelectPrimitive.Value

const SelectTrigger = React.forwardRef(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Trigger
    ref={ref}
    className={cn(
      "flex h-9 w-full items-center justify-between whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background data-[placeholder]:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1",
      className
    )}
    {...props}>
    {children}
    <SelectPrimitive.Icon asChild>
      <ChevronDown className="h-4 w-4 opacity-50" />
    </SelectPrimitive.Icon>
  </SelectPrimitive.Trigger>
))
SelectTrigger.displayName = SelectPrimitive.Trigger.displayName

const SelectScrollUpButton = React.forwardRef(({ className, ...props }, ref) => (
  <SelectPrimitive.ScrollUpButton
    ref={ref}
    className={cn("flex cursor-default items-center justify-center py-1", className)}
    {...props}>
    <ChevronUp className="h-4 w-4" />
  </SelectPrimitive.ScrollUpButton>
))
SelectScrollUpButton.displayName = SelectPrimitive.ScrollUpButton.displayName

const SelectScrollDownButton = React.forwardRef(({ className, ...props }, ref) => (
  <SelectPrimitive.ScrollDownButton
    ref={ref}
    className={cn("flex cursor-default items-center justify-center py-1", className)}
    {...props}>
    <ChevronDown className="h-4 w-4" />
  </SelectPrimitive.ScrollDownButton>
))
SelectScrollDownButton.displayName =
  SelectPrimitive.ScrollDownButton.displayName

const SelectContent = React.forwardRef(({ className, children, position = "popper", ...props }, ref) => (
  <SelectPrimitive.Portal>
    <SelectPrimitive.Content
      ref={ref}
      className={cn(
        "relative z-50 max-h-96 min-w-[8rem] overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
        position === "popper" &&
          "data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1",
        className
      )}
      position={position}
      {...props}>
      <SelectScrollUpButton />
      <SelectPrimitive.Viewport
        className={cn("p-1", position === "popper" &&
          "h-[var(--radix-select-trigger-height)] w-full min-w-[var(--radix-select-trigger-width)]")}>
        {children}
      </SelectPrimitive.Viewport>
      <SelectScrollDownButton />
    </SelectPrimitive.Content>
  </SelectPrimitive.Portal>
))
SelectContent.displayName = SelectPrimitive.Content.displayName

const SelectLabel = React.forwardRef(({ className, ...props }, ref) => (
  <SelectPrimitive.Label
    ref={ref}
    className={cn("px-2 py-1.5 text-sm font-semibold", className)}
    {...props} />
))
SelectLabel.displayName = SelectPrimitive.Label.displayName

const SelectItem = React.forwardRef(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Item
    ref={ref}
    className={cn(
      "relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-2 pr-8 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
      className
    )}
    {...props}>
    <span className="absolute right-2 flex h-3.5 w-3.5 items-center justify-center">
      <SelectPrimitive.ItemIndicator>
        <Check className="h-4 w-4" />
      </SelectPrimitive.ItemIndicator>
    </span>
    <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
  </SelectPrimitive.Item>
))
SelectItem.displayName = SelectPrimitive.Item.displayName

const SelectSeparator = React.forwardRef(({ className, ...props }, ref) => (
  <SelectPrimitive.Separator
    ref={ref}
    className={cn("-mx-1 my-1 h-px bg-muted", className)}
    {...props} />
))
SelectSeparator.displayName = SelectPrimitive.Separator.displayName

/* ------------------------------------------------------------------ *
 * بديل الجوال: كل <Select> عادي في التطبيق يتحوّل تلقائياً إلى لوحة
 * اختيار سفلية (Vaul Drawer) على الشاشات الصغيرة — دون تغيير أي ملف
 * يستخدمه، ودون أي تغيير على سطح المكتب (Radix كما هو).
 * ------------------------------------------------------------------ */

// جمع عناصر القائمة من شجرة <SelectContent> (تدعم التجميع والمصفوفات المولّدة)
function collectItems(node, out = []) {
  React.Children.forEach(node, (child) => {
    if (!React.isValidElement(child)) return;
    if (child.type === SelectItem) {
      out.push({
        value: child.props.value,
        label: child.props.children,
        disabled: child.props.disabled,
        className: child.props.className,
      });
      return;
    }
    if (child.type === SelectSeparator || child.type === SelectScrollUpButton || child.type === SelectScrollDownButton) return;
    const kids = child.props?.children;
    if (kids !== undefined) collectItems(kids, out);
  });
  return out;
}

function MobileSelectSheet({ value, onValueChange, items, placeholder, className, disabled }) {
  const [open, setOpen] = React.useState(false);
  const selected = items.find((it) => it.value === value);

  return (
    <Drawer.Root open={open} onOpenChange={setOpen}>
      <Drawer.Trigger asChild>
        <button
          type="button"
          disabled={disabled}
          className={cn(
            "flex h-9 w-full items-center justify-between whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
            className
          )}
        >
          <span className={cn("line-clamp-1 text-start", !selected && "text-muted-foreground")}>
            {selected ? selected.label : placeholder}
          </span>
          <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
        </button>
      </Drawer.Trigger>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px]" />
        <Drawer.Content className="fixed bottom-0 inset-x-0 z-50 bg-card border-t border-border rounded-t-2xl outline-none">
          <div className="mx-auto mt-3 h-1.5 w-12 shrink-0 rounded-full bg-muted-foreground/30" />
          <div className="max-h-[72vh] overflow-y-auto overscroll-contain p-3 pb-[max(env(safe-area-inset-bottom),16px)] space-y-1">
            {items.length === 0 ? (
              <div className="px-4 py-6 text-center text-sm text-muted-foreground">—</div>
            ) : items.map((it, i) => {
              const active = it.value === value;
              return (
                <button
                  key={`${it.value}-${i}`}
                  type="button"
                  disabled={it.disabled}
                  onClick={() => { onValueChange?.(it.value); setOpen(false); }}
                  className={cn(
                    "flex w-full items-center justify-between rounded-xl px-4 py-3 text-sm text-start transition-colors",
                    active ? "bg-accent text-accent-foreground font-medium" : "hover:bg-accent/60",
                    it.disabled && "opacity-50 pointer-events-none"
                  )}
                >
                  <span className={it.className}>{it.label}</span>
                  {active && <Check className="h-4 w-4 text-violet-600 shrink-0" />}
                </button>
              );
            })}
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}

const Select = React.forwardRef((props, ref) => {
  const isMobile = useIsMobile();
  const { children, ...rest } = props;

  if (!isMobile) {
    return <SelectRoot ref={ref} {...rest}>{children}</SelectRoot>;
  }

  const parts = React.Children.toArray(children).filter(React.isValidElement);
  const trigger = parts.find((c) => c.type === SelectTrigger);
  const content = parts.find((c) => c.type === SelectContent);
  const valueNode = React.Children.toArray(trigger?.props?.children || [])
    .find((c) => React.isValidElement(c) && c.type === SelectValue);

  return (
    <MobileSelectSheet
      value={rest.value}
      onValueChange={rest.onValueChange}
      disabled={rest.disabled}
      placeholder={valueNode?.props?.placeholder}
      className={trigger?.props?.className}
      items={collectItems(content?.props?.children)}
    />
  );
});
Select.displayName = "Select";

export {
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectLabel,
  SelectItem,
  SelectSeparator,
  SelectScrollUpButton,
  SelectScrollDownButton,
}