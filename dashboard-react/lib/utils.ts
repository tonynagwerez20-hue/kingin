export function cn(...inputs: any[]) {
    // Basic implementation of clsx + tailwind-merge
    const classes = inputs.filter(Boolean).join(" ");
    return classes;
}
