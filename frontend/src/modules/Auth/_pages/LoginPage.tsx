import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router';
import { Activity } from 'lucide-react';
import { Button, MainInput } from '@UI/index';
import { useAuth } from '@hooks/useAuth';
import { ERoutes } from '@constants/routes';
import { getErrorMessage } from '../../../app/utils/get-error-message';

const schema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});
type FormValues = z.infer<typeof schema>;

function LoginPage() {
  const navigate = useNavigate();
  const { login, continueAsGuest } = useAuth();
  const [serverError, setServerError] = useState<string | null>(null);

  const onGuest = () => {
    continueAsGuest();
    navigate(ERoutes.DASHBOARD, { replace: true });
  };

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (values: FormValues) => {
    setServerError(null);
    try {
      await login(values);
      navigate(ERoutes.DASHBOARD, { replace: true });
    } catch (err) {
      setServerError(getErrorMessage(err));
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="mb-8 flex items-center justify-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded bg-accent-soft">
            <Activity className="h-5 w-5 text-accent" />
          </div>
          <span className="text-xl font-semibold tracking-tight">
            Trading<span className="text-accent">Term</span>
          </span>
        </div>

        <div className="rounded-lg border border-border bg-surface p-6">
          <h1 className="mb-1 text-xl font-semibold">Sign in</h1>
          <p className="mb-6 text-sm text-text-dim">
            Access the live trading dashboard
          </p>

          <form
            onSubmit={handleSubmit(onSubmit)}
            className="flex flex-col gap-4"
          >
            <MainInput
              label="Email"
              placeholder="trader@example.com"
              type="email"
              autoComplete="email"
              error={errors.email?.message}
              {...register('email')}
            />
            <MainInput
              label="Password"
              placeholder="••••••••"
              type="password"
              autoComplete="current-password"
              error={errors.password?.message}
              {...register('password')}
            />

            {serverError && (
              <div className="rounded border border-down/40 bg-down/10 px-3 py-2 text-xs text-down">
                {serverError}
              </div>
            )}

            <Button type="submit" loading={isSubmitting} className="mt-2">
              Sign in
            </Button>
          </form>

          {/* Guest mode — browse the dashboard without signing up.
              Alerts and other per-user features are disabled. */}
          <div className="my-5 flex items-center gap-3 text-[10px] uppercase tracking-wider text-text-dim">
            <span className="h-px flex-1 bg-border" />
            or
            <span className="h-px flex-1 bg-border" />
          </div>
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={onGuest}
          >
            Continue as guest
          </Button>

          <p className="mt-6 text-center text-sm text-text-dim">
            No account?{' '}
            <Link
              to={ERoutes.REGISTER}
              className="text-accent hover:underline"
            >
              Create one
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
