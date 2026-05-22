// ─── User ─────────────────────────────────────────────────────────────────────

export type UserRole = 'contributor' | 'maintainer';

export interface User {
  id: number;
  name: string;
  email: string;
  password: string;
  role: UserRole;
  created_at: Date;
  updated_at: Date;
}

/** Safe user object — password field omitted */
export type SafeUser = Omit<User, 'password'>;

// ─── Issue ────────────────────────────────────────────────────────────────────

export type IssueType = 'bug' | 'feature_request';
export type IssueStatus = 'open' | 'in_progress' | 'resolved';

export interface Issue {
  id: number;
  title: string;
  description: string;
  type: IssueType;
  status: IssueStatus;
  reporter_id: number;
  created_at: Date;
  updated_at: Date;
}

/** Issue with embedded reporter details (used in list/get responses) */
export interface IssueWithReporter extends Omit<Issue, 'reporter_id'> {
  reporter: {
    id: number;
    name: string;
    role: UserRole;
  };
}

// ─── JWT Payload ──────────────────────────────────────────────────────────────

export interface JwtPayload {
  id: number;
  name: string;
  role: UserRole;
}

// ─── Request Bodies ───────────────────────────────────────────────────────────

export interface SignupBody {
  name: string;
  email: string;
  password: string;
  role?: UserRole;
}

export interface LoginBody {
  email: string;
  password: string;
}

export interface CreateIssueBody {
  title: string;
  description: string;
  type: IssueType;
}

export interface UpdateIssueBody {
  title?: string;
  description?: string;
  type?: IssueType;
  status?: IssueStatus; // maintainer only
}

export interface UpdateIssueStatusBody {
  status: IssueStatus;
}

// ─── Query Params ─────────────────────────────────────────────────────────────

export interface IssueQueryParams {
  sort?: 'newest' | 'oldest';
  type?: IssueType;
  status?: IssueStatus;
}
