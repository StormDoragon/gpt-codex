import { promises as fs } from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';

export type ApplicationStatus = 'pending' | 'approved' | 'rejected';

export type Application = {
  id: string;
  name: string;
  email: string;
  phone: string;
  country: string;
  amount: string;
  accredited: string;
  notes: string;
  status: ApplicationStatus;
  submittedAt: string;
};

const dataFile = path.join(process.cwd(), 'data', 'applications.json');

const seedApplications: Application[] = [
  {
    id: 'seed-1',
    name: 'Amara Osei',
    email: 'amara.osei@example.com',
    phone: '',
    country: 'Ghana',
    amount: '$5,000',
    accredited: 'Not sure',
    notes: 'Interested in the real estate pool.',
    status: 'pending',
    submittedAt: '2026-06-28T10:15:00.000Z',
  },
  {
    id: 'seed-2',
    name: 'Jonas Keller',
    email: 'jonas.keller@example.com',
    phone: '',
    country: 'Germany',
    amount: '$12,000',
    accredited: 'Yes',
    notes: '',
    status: 'approved',
    submittedAt: '2026-06-21T08:40:00.000Z',
  },
  {
    id: 'seed-3',
    name: 'Priya Raman',
    email: 'priya.raman@example.com',
    phone: '',
    country: 'Singapore',
    amount: '$2,400',
    accredited: 'No',
    notes: 'Asked about the 3-year lock period.',
    status: 'pending',
    submittedAt: '2026-07-01T16:05:00.000Z',
  },
];

// The file is the source of truth so that the separately bundled apply and
// admin routes stay consistent. `memory` is only a fallback for when the
// filesystem is read-only, keeping writes visible within a single process.
let memory: Application[] | null = null;

async function load(): Promise<Application[]> {
  try {
    return JSON.parse(await fs.readFile(dataFile, 'utf8')) as Application[];
  } catch {
    return memory ?? [...seedApplications];
  }
}

async function persist(applications: Application[]): Promise<void> {
  memory = applications;
  try {
    await fs.mkdir(path.dirname(dataFile), { recursive: true });
    await fs.writeFile(dataFile, JSON.stringify(applications, null, 2));
  } catch {
    // Read-only filesystem: `memory` still serves the demo within this process.
  }
}

export async function listApplications(): Promise<Application[]> {
  const applications = await load();
  return [...applications].sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
}

export async function countPendingApplications(): Promise<number> {
  const applications = await load();
  return applications.filter((application) => application.status === 'pending').length;
}

export async function addApplication(
  input: Omit<Application, 'id' | 'status' | 'submittedAt'>,
): Promise<Application> {
  const applications = await load();
  const application: Application = {
    ...input,
    id: randomUUID(),
    status: 'pending',
    submittedAt: new Date().toISOString(),
  };
  applications.push(application);
  await persist(applications);
  return application;
}

export async function setApplicationStatus(id: string, status: ApplicationStatus): Promise<void> {
  const applications = await load();
  const application = applications.find((entry) => entry.id === id);
  if (application) {
    application.status = status;
    await persist(applications);
  }
}
