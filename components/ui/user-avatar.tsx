interface UserAvatarProps {
  name: string;
  size?: "small" | "medium";
}

export function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

export function UserAvatar({ name, size = "medium" }: UserAvatarProps) {
  return (
    <span
      aria-label={name}
      className={size === "small" ? "avatar avatar-small" : "avatar"}
      role="img"
    >
      {getInitials(name)}
    </span>
  );
}
