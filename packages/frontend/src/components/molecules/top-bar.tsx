import { SignOutButton } from '@/components/molecules/sign-out-button';
import { ProjectSwitcher } from '@/components/molecules/project-switcher';

export interface TopBarProps {
  userName: string;
  projectName?: string | null;
}

export const TopBar = ({ userName, projectName }: TopBarProps) => {
  return (
    <header className='border-border bg-surface/95 sticky top-0 z-30 flex items-center justify-between gap-4 border-b px-4 py-3 backdrop-blur sm:px-6 lg:px-8'>
      <div className='flex min-w-0 items-center gap-3'>
        <span className='text-text-muted text-xs font-medium tracking-wide uppercase'>Project</span>
        {projectName ? (
          <span className='text-text-primary truncate text-sm font-semibold'>{projectName}</span>
        ) : (
          <ProjectSwitcher />
        )}
      </div>

      <details className='dropdown dropdown-end'>
        <summary className='btn btn-ghost btn-sm list-none'>
          <span
            aria-hidden='true'
            className='bg-accent-muted text-accent flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold'>
            {userName.slice(0, 1).toUpperCase()}
          </span>
          {userName}
        </summary>
        <ul className='dropdown-content menu border-border bg-surface-raised rounded-box z-50 mt-3 w-48 border p-1 shadow-[var(--shadow-elevation-2)]'>
          <li>
            <a href='/app/settings'>Settings</a>
          </li>
          <li>
            <SignOutButton />
          </li>
        </ul>
      </details>
    </header>
  );
};
