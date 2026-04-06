# React App Development Guide

## Tech Stack
- **React 19** + **TypeScript 5.5+** + **Vite 6** (PWA-enabled)
- **Tailwind CSS 4** with CSS-first configuration (`@theme` directive, no `tailwind.config.js`)
- **shadcn/ui** v2 (New York style, stored in `src/shadecn/`) - note the `shadecn` spelling
- **Redux Toolkit** for global UI state (auth, sidebar, page header, agency mode)
- **SWR** for server-state fetching and caching
- **Axios** with request/response interceptors for API calls
- **React Hook Form** + **Zod** (primary) / **Yup** (secondary) for forms
- **React Router v7** with `createBrowserRouter` (framework-agnostic mode)
- **Socket.IO** for real-time chat
- **Framer Motion** for animations
- **Lucide React** + **Hugeicons** for icons

## React 19 Key Changes
- **`ref` as a prop** — No more `forwardRef()`. Components receive `ref` directly in props:
  ```typescript
  // React 19: ref is just a prop
  function MyInput({ ref, ...props }: { ref?: React.Ref<HTMLInputElement> } & InputProps) {
    return <input ref={ref} {...props} />;
  }
  ```
- **`use()` hook** — Read promises and context directly:
  ```typescript
  import { use } from 'react';
  // Read context without useContext
  const theme = use(ThemeContext);
  // Read a promise (suspends until resolved)
  const data = use(dataPromise);
  ```
- **`useActionState`** — Replaces form action patterns:
  ```typescript
  import { useActionState } from 'react';
  const [state, submitAction, isPending] = useActionState(async (prevState, formData) => {
    const result = await saveData(formData);
    return result;
  }, initialState);
  ```
- **`useOptimistic`** — Optimistic UI updates:
  ```typescript
  import { useOptimistic } from 'react';
  const [optimisticItems, addOptimistic] = useOptimistic(items, (state, newItem) => [...state, newItem]);
  ```
- **Document metadata** — `<title>`, `<meta>`, `<link>` can be rendered anywhere in the component tree
- **`<Suspense>` improvements** — Better streaming and selective hydration
- **No more `React.FC` needed** — Prefer plain function declarations with typed props

## Tailwind CSS 4 Key Changes
- **CSS-first configuration** — No `tailwind.config.js`. Configure in CSS:
  ```css
  /* src/app.css */
  @import "tailwindcss";

  @theme {
    --color-primary-50: #eff6ff;
    --color-primary-100: #dbeafe;
    --color-primary-500: #3b82f6;
    --color-primary-600: #2563eb;
    --color-primary-700: #1d4ed8;
    --color-primary-900: #1e3a5f;

    --color-secondary-500: #8b5cf6;
    --color-accent-500: #f59e0b;
    --color-neutral-50: #fafafa;
    --color-neutral-900: #171717;

    --font-sans: 'Inter', sans-serif;
    --font-mono: 'JetBrains Mono', monospace;

    --breakpoint-sm: 640px;
    --breakpoint-md: 768px;
    --breakpoint-lg: 1024px;
    --breakpoint-xl: 1280px;
  }
  ```
- **Automatic content detection** — No `content` array needed; Tailwind 4 auto-detects template files
- **New CSS theme variables** — Use `--color-*`, `--font-*`, `--spacing-*` etc. in `@theme`
- **`@utility` directive** — Define custom utilities in CSS:
  ```css
  @utility scrollbar-hidden {
    &::-webkit-scrollbar { display: none; }
    scrollbar-width: none;
  }
  ```
- **`@variant` directive** — Define custom variants in CSS
- **Native CSS nesting** — Use `&` for nested selectors without plugins
- **No more `@apply` needed in most cases** — Prefer composing Tailwind classes directly
- **`cn()` still works** — `clsx` + `tailwind-merge` pattern unchanged

## Vite 6 Key Changes
- **Environment API** — `import.meta.env` improvements, better `.env` handling
- **Default changes** — `build.target` defaults to modern browsers, ESM-first
- **Improved HMR** — Faster hot module replacement

## React Router v7 Key Changes
- **`createBrowserRouter` still supported** — Framework-agnostic SPA mode works as before
- **New `loader`/`action` pattern** — Optional data loading at route level:
  ```typescript
  const router = createBrowserRouter([
    {
      path: '/dashboard',
      Component: DashboardLayout,
      loader: async () => { /* fetch data */ },
      children: [
        { path: 'overview', Component: Overview },
        { path: 'trades', Component: Trades, loader: tradesLoader },
      ],
    },
  ]);
  ```
- **`useNavigation()`** — Track pending navigations for loading states
- **Type-safe route params** — Improved TypeScript support for route params

## Path Aliases
```
@UI/*          -> src/shared/UI/*
@services/*    -> src/app/api/services/*
@servicesTypes/* -> src/app/api/types/*
@constants/*   -> src/app/constants/*
@app/*         -> src/app/*
@store/*       -> src/store/*
@components/*  -> src/components/*
@assets/*      -> src/assets/*
@hooks         -> src/hooks
@/*            -> src/*
```

## Project Structure
```
src/
├── app/
│   ├── api/services/      # Singleton service classes (auth, org, campaign, etc.)
│   ├── api/types/         # TypeScript interfaces for API (IResponse, IUser, etc.)
│   ├── config/            # envConfig (VITE_* env vars)
│   ├── constants/         # endpoints.ts (EAPI enum), routes.ts, enums.ts, keys.ts, swrkeys.ts
│   ├── router/            # createBrowserRouter with AuthLoader + WithRoleAuthWrapper
│   └── utils/             # Helpers (get-error-message, format-money, truncate-string, etc.)
├── modules/               # Feature modules (Auth, Dashboard, Marketplace, Chat, etc.)
│   └── [Feature]/
│       ├── _components/   # Private sub-components
│       ├── _layouts/      # Feature-specific layouts
│       ├── _views/        # View components
│       ├── _pages/        # Page components
│       ├── _slices/       # Redux slices (if feature-specific)
│       └── [Feature].tsx  # Main entry component
├── shared/
│   ├── UI/                # Reusable UI library (Button, MainInput, MainModal, MainTable, etc.)
│   ├── layouts/           # App layouts, error boundaries
│   └── styles/
├── shadecn/               # shadcn/ui components (note spelling: shadecn, not shadcn)
│   ├── components/ui/     # Radix-based primitives
│   ├── hooks/             # use-toast
│   └── lib/utils.ts       # cn(), getRelativeTime(), trimContent(), etc.
├── store/
│   ├── store.ts           # configureStore with all reducers
│   └── slices/            # Global slices (auth, sidebar, pageHeader, service, agencyMode)
├── hooks/                 # Custom hooks (useErrorToast, useDebounce, useFilter, useMediaQuery, etc.)
├── context/               # SocketProvider, ThemeProvider
├── assets/                # Icons, images, illustrations
├── app.css                # Tailwind 4 CSS-first config with @theme directive
└── main.tsx               # Entry: StrictMode > SWRConfig > Redux Provider > ThemeProvider > RouterProvider
```

## Key Patterns

### API Service Pattern
Services are singleton classes with frozen instances. Methods return `Promise<IResponse<T, 'list' | 'single'>>`.
```typescript
// src/app/api/services/example.service.ts
import api from '..';
import { EAPI } from '@constants/endpoints';
import { IResponse } from '@servicesTypes/api.types';

class ExampleService {
  public async getList(): Promise<IResponse<IExampleItem, 'list'>> {
    const { data } = await api.get(EAPI.EXAMPLE);
    return data;
  }
  public async getById(id: string): Promise<IResponse<IExampleItem, 'single'>> {
    const { data } = await api.get(`${EAPI.EXAMPLE}/${id}`);
    return data;
  }
  public async create(body: ICreateExamplePayload): Promise<IResponse<IExampleItem, 'single'>> {
    const { data } = await api.post(EAPI.EXAMPLE, body);
    return data;
  }
}
export default Object.freeze(new ExampleService());
```

### SWR Data Fetching Hook Pattern
```typescript
// src/hooks/use-get-example.tsx
import useSWR from 'swr';
import { SWR_KEYS } from '@constants/swrkeys';
import exampleService from '@services/example.service';

const useGetExample = () => {
  const { data, isLoading, error, mutate } = useSWR(
    [SWR_KEYS.EXAMPLE],
    () => exampleService.getList().then((res) => res?.data)
  );
  return { data, isLoading, error, mutate };
};
export default useGetExample;
```

### Component Pattern (React 19)
Components use `cn()` for class merging, receive `ref` as a prop (no forwardRef), typed props.
```typescript
import { cn } from '@/shadecn/lib/utils';

interface Props extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'outlined';
  ref?: React.Ref<HTMLDivElement>;
}

function MyComponent({ variant = 'default', className, ref, ...props }: Props) {
  return (
    <div
      ref={ref}
      className={cn('base-classes', { 'variant-classes': variant === 'outlined' }, className)}
      {...props}
    />
  );
}
export default MyComponent;
```

### Form Pattern (React Hook Form + Zod)
```typescript
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormField } from '@/shadecn/components/ui/form';
import { MainInput, Button } from '@UI/index';

const schema = z.object({
  fieldName: z.string().min(1, 'Required'),
  email: z.string().email('Invalid email'),
});

type FormValues = z.infer<typeof schema>;

function MyForm() {
  const form = useForm<FormValues>({ resolver: zodResolver(schema) });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <FormField control={form.control} name="fieldName"
          render={({ field }) => <MainInput field={field} label="Label" placeholder="..." />}
        />
        <Button type="submit" loading={isLoading}>Submit</Button>
      </form>
    </Form>
  );
}
```

### Redux Slice Pattern
```typescript
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { RootState } from '@store/store';

const exampleSlice = createSlice({
  name: 'example',
  initialState: { value: '' },
  reducers: {
    setValue(state, action: PayloadAction<string>) { state.value = action.payload; },
  },
});
export const { setValue } = exampleSlice.actions;
export const selectValue = (state: RootState) => state.example.value;
export default exampleSlice.reducer;
```

### Error Handling Pattern
```typescript
import { useErrorToast } from '@/hooks/use-error-toast';
const showError = useErrorToast();
try { await apiCall(); } catch (error) { showError(error); }
```

### Page Component Pattern
```typescript
import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { setPage } from '@store/slices/pageHeaderSlice';

export default function FeaturePage() {
  const dispatch = useDispatch();
  useEffect(() => { dispatch(setPage({ title: 'Feature Title' })); }, [dispatch]);
  return <div className="flex flex-col gap-6">{/* content */}</div>;
}
```

## Naming Conventions
- **Interfaces:** `IXxx` prefix (e.g., `IUser`, `IResponse`)
- **Types:** `TXxx` prefix (e.g., `TTokensObject`)
- **Enums:** `EXxx` prefix (e.g., `EAPI`, `ELocalStorageKeys`, `EFormFieldType`)
- **UI Components:** `Main<Name>` for shared UI (e.g., `MainInput`, `MainModal`, `MainTable`)
- **Feature dirs:** `_components/`, `_layouts/`, `_views/`, `_pages/`, `_slices/` (underscore prefix)
- **Hooks:** `use<Name>` (e.g., `useErrorToast`, `useGetCategoriesOptions`)
- **Services:** `<domain>.service.ts` with class-based singleton pattern
- **Components:** PascalCase, default export, plain functions (not React.FC)

## Barrel Exports
- `src/shared/UI/index.ts` exports all shared UI components
- Import shared UI as: `import { Button, MainInput, MainModal } from '@UI/index'`

## Provider Stack (main.tsx)
```
StrictMode > SWRConfig > Redux Provider > ThemeProvider > RouterProvider
+ Toaster (shadcn) + ToastContainer (react-toastify)
```
