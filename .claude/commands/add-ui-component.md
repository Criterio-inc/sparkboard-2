---
description: Add a new shadcn/ui component to the project with proper configuration
---

Add a new shadcn/ui component to Sparkboard following the project's established patterns.

## Available shadcn/ui Components

The project already has 49 shadcn/ui components installed. Common components include:

**Layout**: Card, Separator, Tabs, Sheet, Dialog, Drawer
**Forms**: Button, Input, Textarea, Select, Checkbox, RadioGroup, Switch, Label, Form
**Feedback**: Alert, Toast (Sonner), Progress, Skeleton
**Overlay**: Dialog, AlertDialog, Popover, Tooltip, DropdownMenu, ContextMenu
**Data**: Table, Pagination, Avatar, Badge
**Navigation**: NavigationMenu, Breadcrumb, Menubar
**Other**: Accordion, Collapsible, ScrollArea, Slider, Calendar

## Before Adding New Component

1. **Check if already installed**:
   ```bash
   ls /home/user/sparkboard2/src/components/ui/
   ```

2. **Check components.json** to see shadcn config:
   ```bash
   cat /home/user/sparkboard2/components.json
   ```

## Adding a New Component

### Method 1: Using shadcn CLI (Recommended)

```bash
cd /home/user/sparkboard2

# Add a single component
npx shadcn@latest add [component-name]

# Examples:
npx shadcn@latest add button
npx shadcn@latest add card
npx shadcn@latest add form
npx shadcn@latest add dialog
```

This will:
- Download the component to `src/components/ui/`
- Install any required dependencies
- Configure for your project's Tailwind setup

### Method 2: Manual Installation

If CLI doesn't work, manually create the component:

1. Visit https://ui.shadcn.com/docs/components/[component-name]
2. Copy the component code
3. Create file in `/home/user/sparkboard2/src/components/ui/[component-name].tsx`
4. Install any required dependencies listed on the docs

## Project Configuration

The project uses these shadcn/ui settings (from `components.json`):

```json
{
  "style": "new-york",
  "rsc": false,
  "tsx": true,
  "tailwind": {
    "config": "tailwind.config.ts",
    "css": "src/index.css",
    "baseColor": "zinc",
    "cssVariables": true
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils"
  }
}
```

**Key Points**:
- ✅ **TypeScript**: All components use `.tsx`
- ✅ **CSS Variables**: Uses Tailwind CSS variables for theming
- ✅ **Path Aliases**: Use `@/components/ui/` for imports
- ✅ **Base Color**: Zinc (neutral gray scale)
- ✅ **Dark Mode**: Supported via `next-themes`

## Using Components in Your Code

### Basic Usage

```typescript
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function MyComponent() {
  return (
    <Card>
      <CardHeader>
        <h2 className="text-lg font-semibold">My Card</h2>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <Label htmlFor="name">Name</Label>
          <Input id="name" placeholder="Enter name" />
        </div>
      </CardContent>
      <CardFooter>
        <Button>Submit</Button>
      </CardFooter>
    </Card>
  );
}
```

### With Variants

Many components support variants via `class-variance-authority`:

```typescript
import { Button } from "@/components/ui/button";

export function ButtonExamples() {
  return (
    <>
      <Button variant="default">Default</Button>
      <Button variant="destructive">Destructive</Button>
      <Button variant="outline">Outline</Button>
      <Button variant="secondary">Secondary</Button>
      <Button variant="ghost">Ghost</Button>
      <Button variant="link">Link</Button>

      <Button size="default">Default Size</Button>
      <Button size="sm">Small</Button>
      <Button size="lg">Large</Button>
      <Button size="icon">🔍</Button>
    </>
  );
}
```

### Dark Mode Support

Components automatically support dark mode via `next-themes`:

```typescript
// The theme provider is already set up in the app
// Components use CSS variables that change based on theme

// User can toggle theme (already implemented in Navigation)
import { useTheme } from "next-themes";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <Button onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
      Toggle Theme
    </Button>
  );
}
```

## Common Component Patterns

### Dialog/Modal Pattern

```typescript
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export function MyDialog() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button>Open Dialog</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Dialog Title</DialogTitle>
        </DialogHeader>
        <div>Dialog content goes here</div>
      </DialogContent>
    </Dialog>
  );
}
```

### Form Pattern

```typescript
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const formSchema = z.object({
  username: z.string().min(2, "Username must be at least 2 characters"),
});

export function MyForm() {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { username: "" },
  });

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    console.log(values);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="username"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Username</FormLabel>
              <FormControl>
                <Input placeholder="Enter username" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit">Submit</Button>
      </form>
    </Form>
  );
}
```

### Toast Notifications

The project uses Sonner for toasts:

```typescript
import { toast } from "sonner";

export function MyComponent() {
  const handleClick = () => {
    toast.success("Operation successful!");
    // or
    toast.error("Something went wrong");
    // or
    toast.info("Information message");
    // or
    toast.loading("Loading...");
  };

  return <Button onClick={handleClick}>Show Toast</Button>;
}
```

### Dropdown Menu Pattern

```typescript
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

export function MyDropdown() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline">Open Menu</Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuLabel>My Account</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem>Profile</DropdownMenuItem>
        <DropdownMenuItem>Settings</DropdownMenuItem>
        <DropdownMenuItem>Logout</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

## Styling with Tailwind

### Responsive Design

```typescript
<Card className="w-full md:w-1/2 lg:w-1/3">
  {/* Full width on mobile, half on tablet, third on desktop */}
</Card>

<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {/* 1 column on mobile, 2 on tablet, 3 on desktop */}
</div>
```

### Dark Mode Classes

```typescript
<div className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100">
  {/* White background in light mode, dark in dark mode */}
</div>
```

### Utility Classes

```typescript
<div className="space-y-4">         {/* Vertical spacing */}
<div className="flex items-center gap-2"> {/* Flex with gap */}
<div className="rounded-lg border p-4">  {/* Padding, border, rounded */}
```

## Customizing Components

### DO: Extend with Wrapper Components

```typescript
import { Button, ButtonProps } from "@/components/ui/button";

interface LoadingButtonProps extends ButtonProps {
  loading?: boolean;
}

export function LoadingButton({ loading, children, ...props }: LoadingButtonProps) {
  return (
    <Button disabled={loading} {...props}>
      {loading ? "Loading..." : children}
    </Button>
  );
}
```

### DON'T: Edit ui/ Components Directly

❌ **Don't edit** files in `src/components/ui/` directly
✅ **Do create** wrapper components or use className prop

## Common Dependencies

If adding components requires new dependencies:

```bash
# Radix UI primitives (most shadcn components use these)
npm install @radix-ui/react-[component-name]

# Icons (Lucide)
npm install lucide-react

# Utilities
npm install class-variance-authority
npm install clsx tailwind-merge

# Date picker
npm install date-fns react-day-picker

# Form validation
npm install zod react-hook-form @hookform/resolvers
```

## Verification

After adding a component:

1. **TypeScript check**:
   ```bash
   npm run typecheck
   ```

2. **Lint check**:
   ```bash
   npm run lint
   ```

3. **Build check**:
   ```bash
   npm run build
   ```

4. **Visual check**:
   - Test in light mode
   - Test in dark mode
   - Test responsive behavior
   - Verify accessibility (keyboard navigation, screen readers)

## Reference

- **shadcn/ui docs**: https://ui.shadcn.com
- **Radix UI docs**: https://www.radix-ui.com
- **Tailwind docs**: https://tailwindcss.com
- **Project config**: `/home/user/sparkboard2/components.json`
- **Existing components**: `/home/user/sparkboard2/src/components/ui/`

Now tell me which component you need, and I'll help you add it!
