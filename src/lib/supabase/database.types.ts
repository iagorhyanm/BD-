
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "app_config": {
                  Row: {
                    "atualizado_em": string,"atualizado_por": string | null,"aviso_ativo": boolean,"aviso_texto": string | null,"boas_vindas": string,"id": number,"nome": string,"slogan": string
                  }
                  ComputedFields: never
                  Insert: {
                    "atualizado_em"?: string,"atualizado_por"?: string | null,"aviso_ativo"?: boolean,"aviso_texto"?: string | null,"boas_vindas"?: string,"id"?: number,"nome"?: string,"slogan"?: string
                  }
                  Update: {
                    "atualizado_em"?: string,"atualizado_por"?: string | null,"aviso_ativo"?: boolean,"aviso_texto"?: string | null,"boas_vindas"?: string,"id"?: number,"nome"?: string,"slogan"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "app_config_atualizado_por_fkey"
      columns: ["atualizado_por"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"checkins": {
                  Row: {
                    "anotacao": string | null,"atualizado_em": string,"criado_em": string,"data": string,"foto_path": string | null,"id": string,"minutos": number | null,"no_prazo": boolean,"user_id": string,"versiculo": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "anotacao"?: string | null,"atualizado_em"?: string,"criado_em"?: string,"data"?: string,"foto_path"?: string | null,"id"?: string,"minutos"?: number | null,"no_prazo"?: boolean,"user_id"?: string,"versiculo"?: string | null
                  }
                  Update: {
                    "anotacao"?: string | null,"atualizado_em"?: string,"criado_em"?: string,"data"?: string,"foto_path"?: string | null,"id"?: string,"minutos"?: number | null,"no_prazo"?: boolean,"user_id"?: string,"versiculo"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "checkins_data_plano_fkey"
      columns: ["data"]
isOneToOne: false
      referencedRelation: "plano_dias"
      referencedColumns: ["data"]
    },{
      foreignKeyName: "checkins_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"comentarios": {
                  Row: {
                    "checkin_id": string,"criado_em": string,"id": string,"texto": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "checkin_id": string,"criado_em"?: string,"id"?: string,"texto": string,"user_id"?: string
                  }
                  Update: {
                    "checkin_id"?: string,"criado_em"?: string,"id"?: string,"texto"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "comentarios_checkin_id_fkey"
      columns: ["checkin_id"]
isOneToOne: false
      referencedRelation: "checkins"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "comentarios_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"grupo_membros": {
                  Row: {
                    "entrou_em": string,"grupo_id": string,"papel": Database["public"]['Enums']["papel_grupo"],"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "entrou_em"?: string,"grupo_id": string,"papel"?: Database["public"]['Enums']["papel_grupo"],"user_id": string
                  }
                  Update: {
                    "entrou_em"?: string,"grupo_id"?: string,"papel"?: Database["public"]['Enums']["papel_grupo"],"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "grupo_membros_grupo_id_fkey"
      columns: ["grupo_id"]
isOneToOne: false
      referencedRelation: "grupos"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "grupo_membros_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"grupos": {
                  Row: {
                    "atualizado_em": string,"codigo": string,"criado_em": string,"criado_por": string | null,"descricao": string | null,"fim": string | null,"id": string,"inicio": string,"nome": string
                  }
                  ComputedFields: never
                  Insert: {
                    "atualizado_em"?: string,"codigo"?: string,"criado_em"?: string,"criado_por"?: string | null,"descricao"?: string | null,"fim"?: string | null,"id"?: string,"inicio"?: string,"nome": string
                  }
                  Update: {
                    "atualizado_em"?: string,"codigo"?: string,"criado_em"?: string,"criado_por"?: string | null,"descricao"?: string | null,"fim"?: string | null,"id"?: string,"inicio"?: string,"nome"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "grupos_criado_por_fkey"
      columns: ["criado_por"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"livros_biblia": {
                  Row: {
                    "abrev": string,"capitulos": number,"id": string,"nome": string,"ordem": number,"testamento": string
                  }
                  ComputedFields: never
                  Insert: {
                    "abrev": string,"capitulos": number,"id": string,"nome": string,"ordem": number,"testamento": string
                  }
                  Update: {
                    "abrev"?: string,"capitulos"?: number,"id"?: string,"nome"?: string,"ordem"?: number,"testamento"?: string
                  }
                  Relationships: [
                    
                  ]
                },"logs": {
                  Row: {
                    "acao": string,"ator_id": string | null,"ator_nome": string | null,"criado_em": string,"dados": Json | null,"descricao": string | null,"entidade": string,"entidade_id": string | null,"id": number
                  }
                  ComputedFields: never
                  Insert: {
                    "acao": string,"ator_id"?: string | null,"ator_nome"?: string | null,"criado_em"?: string,"dados"?: Json | null,"descricao"?: string | null,"entidade": string,"entidade_id"?: string | null,"id"?: never
                  }
                  Update: {
                    "acao"?: string,"ator_id"?: string | null,"ator_nome"?: string | null,"criado_em"?: string,"dados"?: Json | null,"descricao"?: string | null,"entidade"?: string,"entidade_id"?: string | null,"id"?: never
                  }
                  Relationships: [
                    {
      foreignKeyName: "logs_ator_id_fkey"
      columns: ["ator_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"plano_dias": {
                  Row: {
                    "atualizado_em": string,"data": string,"leitura": string,"referencias": NonNullable<Json>,"texto": string | null,"titulo": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "atualizado_em"?: string,"data": string,"leitura": string,"referencias"?: NonNullable<Json>,"texto"?: string | null,"titulo"?: string | null
                  }
                  Update: {
                    "atualizado_em"?: string,"data"?: string,"leitura"?: string,"referencias"?: NonNullable<Json>,"texto"?: string | null,"titulo"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"profiles": {
                  Row: {
                    "ativo": boolean,"atualizado_em": string,"criado_em": string,"email": string | null,"id": string,"nome": string,"papel": Database["public"]['Enums']["papel_app"],"precisa_trocar_senha": boolean,"telefone": string | null,"usuario": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "ativo"?: boolean,"atualizado_em"?: string,"criado_em"?: string,"email"?: string | null,"id": string,"nome": string,"papel"?: Database["public"]['Enums']["papel_app"],"precisa_trocar_senha"?: boolean,"telefone"?: string | null,"usuario"?: string | null
                  }
                  Update: {
                    "ativo"?: boolean,"atualizado_em"?: string,"criado_em"?: string,"email"?: string | null,"id"?: string,"nome"?: string,"papel"?: Database["public"]['Enums']["papel_app"],"precisa_trocar_senha"?: boolean,"telefone"?: string | null,"usuario"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"reacoes": {
                  Row: {
                    "checkin_id": string,"criado_em": string,"emoji": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "checkin_id": string,"criado_em"?: string,"emoji": string,"user_id"?: string
                  }
                  Update: {
                    "checkin_id"?: string,"criado_em"?: string,"emoji"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "reacoes_checkin_id_fkey"
      columns: ["checkin_id"]
isOneToOne: false
      referencedRelation: "checkins"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "reacoes_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "compartilha_grupo":
{ Args: { "p_outro": string }; Returns: boolean
                           },
"e_membro":
{ Args: { "p_grupo": string }; Returns: boolean
                           },
"entrar_no_grupo":
{ Args: { "p_codigo": string }; Returns: string
                           },
"estatisticas_usuario":
{ Args: { "p_user": string }; Returns: Json
                           },
"gerar_codigo_convite":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"grupo_por_codigo":
{ Args: { "p_codigo": string }; Returns: Json
                           },
"hoje_belem":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"is_admin":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"limites_plano":
{ Args: Record<PropertyKey, never>; Returns: Json
                           },
"papel_no_grupo":
{ Args: { "p_grupo": string }; Returns: Database["public"]['Enums']["papel_grupo"]
                           },
"placar_grupo":
{ Args: { "p_grupo": string }; Returns: {
              "nome": string,"papel": Database["public"]['Enums']["papel_grupo"],"pontos": number,"sequencia": number,"ultimo": string,"user_id": string
            }[]
                           },
"registrar_log":
{ Args: { "p_acao": string,"p_dados"?: Json,"p_descricao"?: string,"p_entidade": string,"p_entidade_id"?: string }; Returns: undefined
                           },
"sequencia_atual":
{ Args: { "p_user": string }; Returns: number
                           },
"uso_armazenamento":
{ Args: Record<PropertyKey, never>; Returns: {
              "arquivos": number,"bucket": string,"bytes": number
            }[]
                           },
"usuario_ativo":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           }
          }
          Enums: {
            "papel_app": "admin"|"usuario","papel_grupo": "dono"|"admin"|"membro"
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Insert: infer I
    }
    ? I
    : never
  : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Update: infer U
    }
    ? U
    : never
  : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            "papel_app": ["admin", "usuario"],"papel_grupo": ["dono", "admin", "membro"]
          }
        }
} as const
