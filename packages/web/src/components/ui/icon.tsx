import {Icon as IconifyIcon} from "@iconify/react/offline";
import type {IconProps as IconifyIconProps} from "@iconify/react/offline";
import icons from "@assets/ui-icons.json";
import {cn} from "@/lib/cn";

export type IconName = keyof typeof icons;

const sizeClasses: Record<NonNullable<IconProps["size"]>, string> = {
  xs: "size-3.5",
  sm: "size-4",
  md: "size-5",
  lg: "size-6",
};

interface IconProps extends Omit<IconifyIconProps, "children" | "icon" | "size"> {
  name: IconName;
  size?: "lg" | "md" | "sm" | "xs";
}

export default function Icon(props: IconProps) {
  const {className, name, size = "md", ...iconProps} = props;
  const icon = icons[name];
  const resolvedClassName = cn(sizeClasses[size], "ui-icon shrink-0", className);

  return <IconifyIcon aria-hidden="true" className={resolvedClassName} icon={icon} ssr {...iconProps} />;
}
