---
name: frontend-performance
description:
  Optimize Next.js frontend performance — navigation, loading states, images, data fetching, and
  bundle size. Use when fixing slow navigation, adding loading skeletons, or optimizing page load.
user-invocable: true
allowed-tools: Read, Grep, Glob, Edit, Bash, Write
argument-hint: [page or component to optimize]
---

# Frontend Performance Optimization

Optimize Next.js App Router performance following project conventions.

If arguments are provided, focus on: $ARGUMENTS

## Pre-check

Before making changes, read the target file(s) and identify:

1. Any `router.push()` that should be `<Link>`
2. Missing `loading.tsx` files for route groups
3. Unoptimized images (no `next/image`, missing dimensions)
4. Data fetching waterfalls
5. Heavy components that should be dynamically imported

## Rules

### Navigation — Use `<Link>` not `router.push()`

`<Link>` **prefetches** automatically. `router.push()` loads on-demand (slow).

```tsx
// BAD
<Button onClick={() => router.push('/dashboard')}>Go</Button>

// GOOD
<Link href="/dashboard">
  <Button data-eram-test-id="go-btn">Go</Button>
</Link>
```

Only use `router.push()` for **programmatic redirects** (after form submit, API call, conditional
logic).

When wrapping `<Button>` in `<Link>`, BOTH need `data-eram-test-id`.

For dynamic routes where `router.push()` is necessary, prefetch early:

```tsx
useEffect(() => {
  router.prefetch(`/app/student/teachers/${teacherId}`);
}, [teacherId]);
```

### Loading States — Always add `loading.tsx`

Next.js shows `loading.tsx` **instantly** during navigation (no blank screen).

Place at route group level:

- `app/auth/loading.tsx` — spinner
- `app/app/student/loading.tsx` — card skeleton grid
- `app/app/tutor/loading.tsx` — card skeleton grid
- `app/complete-profile/loading.tsx` — spinner

Card skeleton pattern:

```tsx
export default function Loading() {
  return (
    <div className="min-h-screen bg-[#F5F5F5] p-4">
      <div className="mx-auto max-w-screen-laptop space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="animate-pulse rounded-2xl bg-white p-5">
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-full bg-gray-200" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-3/4 rounded bg-gray-200" />
                <div className="h-3 w-1/2 rounded bg-gray-100" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

Spinner pattern:

```tsx
export default function Loading() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
    </div>
  );
}
```

### Images — Always use `next/image`

```tsx
<Image src={hero} alt="" fill priority sizes="100vw" />       // above-fold, responsive
<Image src={avatar} alt="" width={48} height={48} />           // fixed size, lazy (default)
```

- `priority` on above-the-fold images only (hero, logo)
- Always set `width`/`height` or `fill` to prevent layout shifts
- Use `sizes` for responsive images

### Data Fetching — Avoid waterfalls

```tsx
// BAD — sequential
const { data: user } = useSWR('user', fetchUser);
useEffect(() => {
  if (user) fetchPosts(user.id);
}, [user]);

// GOOD — parallel with conditional
const { data: user } = useSWR('user', fetchUser);
const { data: posts } = useSWR(user ? ['posts', user.id] : null, () => fetchPosts(user!.id));
```

SWR tips:

- `revalidateOnFocus: false` for stable data
- `dedupingInterval` to prevent duplicate requests
- Keep SWR keys stable (no object references that change every render)

### Dynamic Imports — For heavy components

```tsx
import dynamic from 'next/dynamic';

const HeavyChart = dynamic(() => import('./HeavyChart'), {
  loading: () => <div className="h-64 animate-pulse rounded-xl bg-gray-100" />,
});
```

Use for: carousels, charts, modals, rich text editors, video players.

### Bundle Size

- Keep `'use client'` as low in the component tree as possible
- Server components (default) ship zero JS
- Extract interactive parts into small client components

### CSS Performance

- Use `transition-colors` instead of `transition-all` when only color changes
- Avoid `backdrop-blur` on large areas (GPU heavy on mobile)
- Use `will-change-transform` sparingly (only for animations)

## Checklist

After optimizing, verify:

- [ ] No `router.push()` for simple navigation (should be `<Link>`)
- [ ] `loading.tsx` exists for the route group
- [ ] All images use `next/image` with dimensions
- [ ] No data fetching waterfalls
- [ ] Heavy components use dynamic imports
- [ ] All interactive elements have `data-eram-test-id`
