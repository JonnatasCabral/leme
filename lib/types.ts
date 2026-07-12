// Tipos TypeScript que espelham as tabelas do banco (ver schema.sql)

export type ContributionType = "comment" | "suggestion" | "fork";

// Observação: usamos "type" (não "interface") aqui de propósito. O
// supabase-js/postgrest-js precisa que Row/Insert/Update sejam tipos objeto
// "puros" para conseguir casar a inferência de tipos do select/insert/update;
// com "interface" (que não ganha index signature implícita) a inferência
// quebra silenciosamente e todo select()/insert() vira "never".
export type HtmlPage = {
  id: string;
  user_id: string | null;
  title: string;
  description: string | null;
  file_path: string;
  views_count: number;
  created_at: string;
  expires_at: string | null;
  anon_id: string | null;
  expires_at_before_pro: string | null;
};

export type Plan = "free" | "pro";

export type Profile = {
  id: string;
  plan: Plan;
  created_at: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  stripe_price_id: string | null;
  current_period_end: string | null;
};

export type ShareLink = {
  id: string;
  page_id: string;
  token: string;
  created_by: string | null;
  expires_at: string | null;
  created_at: string;
};

export type Contribution = {
  id: string;
  page_id: string;
  user_id: string | null;
  author_name: string;
  content: string;
  type: ContributionType;
  fork_page_id: string | null;
  created_at: string;
};

// Schema completo do banco, usado para tipar o client do Supabase.
// O campo "Relationships" (mesmo vazio) é exigido pelo supabase-js/postgrest-js
// para que a inferência de tipos de select/insert/update funcione corretamente.
export interface Database {
  public: {
    Tables: {
      html_pages: {
        Row: HtmlPage;
        Insert: Partial<HtmlPage> & {
          title: string;
          file_path: string;
        };
        Update: Partial<HtmlPage>;
        Relationships: [];
      };
      share_links: {
        Row: ShareLink;
        Insert: Partial<ShareLink> & {
          page_id: string;
          token: string;
        };
        Update: Partial<ShareLink>;
        Relationships: [];
      };
      contributions: {
        Row: Contribution;
        Insert: Partial<Contribution> & {
          page_id: string;
          content: string;
        };
        Update: Partial<Contribution>;
        Relationships: [];
      };
      profiles: {
        Row: Profile;
        Insert: Partial<Profile> & { id: string };
        Update: Partial<Profile>;
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      increment_views: {
        Args: { page_id: string };
        Returns: void;
      };
      apply_pro_upgrade: {
        Args: { target_user_id: string };
        Returns: void;
      };
      apply_pro_downgrade: {
        Args: { target_user_id: string; fallback_days: number };
        Returns: void;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}

// -- Tipos auxiliares usados nas respostas das rotas de API --

export interface UploadResponse {
  page: HtmlPage;
}

export interface ShareResponse {
  shareLink: ShareLink;
  url: string;
}

export interface PageByTokenResponse {
  page: Pick<HtmlPage, "id" | "title" | "description" | "file_path" | "views_count" | "created_at">;
  shareLink: Pick<ShareLink, "id" | "token" | "expires_at">;
}
