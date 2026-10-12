'use client';

import { useEffect, useState } from 'react';

import { fetchProjects } from '@/lib/api';
import type { ProjectSummary } from '@/lib/api/types';

const ACTIVE_PROJECT_KEY = 'mri-lab:active-project';

export interface ProjectSwitcherProps {
  onProjectChange?: (projectId: string | null) => void;
}

export const ProjectSwitcher = ({ onProjectChange }: ProjectSwitcherProps) => {
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [activeId, setActiveId] = useState<string>('');

  useEffect(() => {
    let cancelled = false;
    fetchProjects({ limit: 50 })
      .then((page) => {
        if (cancelled) {
          return;
        }
        setProjects(page.items);
        const stored = window.localStorage.getItem(ACTIVE_PROJECT_KEY);
        const initial = stored && page.items.some((item) => item.id === stored) ? stored : '';
        setActiveId(initial);
      })
      .catch(() => {
        if (!cancelled) {
          setProjects([]);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleChange = (value: string) => {
    setActiveId(value);
    if (value) {
      window.localStorage.setItem(ACTIVE_PROJECT_KEY, value);
    } else {
      window.localStorage.removeItem(ACTIVE_PROJECT_KEY);
    }
    onProjectChange?.(value || null);
  };

  return (
    <select
      aria-label='Active project'
      value={activeId}
      onChange={(event) => handleChange(event.target.value)}
      disabled={projects.length === 0}
      className='select select-bordered select-sm w-56 disabled:cursor-not-allowed disabled:opacity-60'>
      <option value=''>{projects.length > 0 ? 'All projects' : 'No projects'}</option>
      {projects.map((project) => (
        <option key={project.id} value={project.id}>
          {project.name}
        </option>
      ))}
    </select>
  );
};
