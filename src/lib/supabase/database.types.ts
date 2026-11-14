
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
            "avaliacoes": {
                  Row: {
                    "atualizado_em": string,"comentario": string | null,"coordenador_id": string,"criado_em": string,"id": string,"inscricao_id": string,"nota": number
                  }
                  ComputedFields: never
                  Insert: {
                    "atualizado_em"?: string,"comentario"?: string | null,"coordenador_id": string,"criado_em"?: string,"id"?: string,"inscricao_id": string,"nota": number
                  }
                  Update: {
                    "atualizado_em"?: string,"comentario"?: string | null,"coordenador_id"?: string,"criado_em"?: string,"id"?: string,"inscricao_id"?: string,"nota"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "avaliacoes_coordenador_id_fkey"
      columns: ["coordenador_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "avaliacoes_inscricao_id_fkey"
      columns: ["inscricao_id"]
isOneToOne: false
      referencedRelation: "inscricoes"
      referencedColumns: ["id"]
    }
                  ]
                },"edicoes": {
                  Row: {
                    "ano": number | null,"ativa": boolean,"atualizado_em": string,"criado_em": string,"criado_por": string | null,"id": string,"limite_faltas": number,"nome": string,"texto_lgpd": string,"vagas_feminino": number,"vagas_masculino": number
                  }
                  ComputedFields: never
                  Insert: {
                    "ano"?: number | null,"ativa"?: boolean,"atualizado_em"?: string,"criado_em"?: string,"criado_por"?: string | null,"id"?: string,"limite_faltas"?: number,"nome": string,"texto_lgpd"?: string,"vagas_feminino"?: number,"vagas_masculino"?: number
                  }
                  Update: {
                    "ano"?: number | null,"ativa"?: boolean,"atualizado_em"?: string,"criado_em"?: string,"criado_por"?: string | null,"id"?: string,"limite_faltas"?: number,"nome"?: string,"texto_lgpd"?: string,"vagas_feminino"?: number,"vagas_masculino"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "edicoes_criado_por_fkey"
      columns: ["criado_por"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"formularios": {
                  Row: {
                    "aberto": boolean,"abre_em": string | null,"atualizado_em": string,"capa_path": string | null,"criado_em": string,"criado_por": string | null,"descricao": string | null,"edicao_id": string,"fecha_em": string | null,"id": string,"limite": number | null,"msg_confirmacao": string,"slug": string,"texto_lgpd": string | null,"titulo": string
                  }
                  ComputedFields: never
                  Insert: {
                    "aberto"?: boolean,"abre_em"?: string | null,"atualizado_em"?: string,"capa_path"?: string | null,"criado_em"?: string,"criado_por"?: string | null,"descricao"?: string | null,"edicao_id": string,"fecha_em"?: string | null,"id"?: string,"limite"?: number | null,"msg_confirmacao"?: string,"slug": string,"texto_lgpd"?: string | null,"titulo": string
                  }
                  Update: {
                    "aberto"?: boolean,"abre_em"?: string | null,"atualizado_em"?: string,"capa_path"?: string | null,"criado_em"?: string,"criado_por"?: string | null,"descricao"?: string | null,"edicao_id"?: string,"fecha_em"?: string | null,"id"?: string,"limite"?: number | null,"msg_confirmacao"?: string,"slug"?: string,"texto_lgpd"?: string | null,"titulo"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "formularios_criado_por_fkey"
      columns: ["criado_por"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "formularios_edicao_id_fkey"
      columns: ["edicao_id"]
isOneToOne: false
      referencedRelation: "edicoes"
      referencedColumns: ["id"]
    }
                  ]
                },"inscricoes": {
                  Row: {
                    "ano_anterior": number | null,"atualizado_em": string,"cidade": string,"consentimento": boolean,"consentimento_em": string,"criado_em": string,"edicao_id": string,"equipe_anterior": string | null,"formulario_id": string,"id": string,"idade": number,"ja_trabalhou": boolean,"nascimento": string,"nome": string,"resp_consentimento": boolean | null,"resp_nome": string | null,"resp_telefone": string | null,"respostas": NonNullable<Json>,"sexo": Database["public"]['Enums']["sexo"],"status": Database["public"]['Enums']["status_inscricao"],"telefone": string
                  }
                  ComputedFields: never
                  Insert: {
                    "ano_anterior"?: number | null,"atualizado_em"?: string,"cidade": string,"consentimento": boolean,"consentimento_em"?: string,"criado_em"?: string,"edicao_id": string,"equipe_anterior"?: string | null,"formulario_id": string,"id"?: string,"idade": number,"ja_trabalhou": boolean,"nascimento": string,"nome": string,"resp_consentimento"?: boolean | null,"resp_nome"?: string | null,"resp_telefone"?: string | null,"respostas"?: NonNullable<Json>,"sexo": Database["public"]['Enums']["sexo"],"status"?: Database["public"]['Enums']["status_inscricao"],"telefone": string
                  }
                  Update: {
                    "ano_anterior"?: number | null,"atualizado_em"?: string,"cidade"?: string,"consentimento"?: boolean,"consentimento_em"?: string,"criado_em"?: string,"edicao_id"?: string,"equipe_anterior"?: string | null,"formulario_id"?: string,"id"?: string,"idade"?: number,"ja_trabalhou"?: boolean,"nascimento"?: string,"nome"?: string,"resp_consentimento"?: boolean | null,"resp_nome"?: string | null,"resp_telefone"?: string | null,"respostas"?: NonNullable<Json>,"sexo"?: Database["public"]['Enums']["sexo"],"status"?: Database["public"]['Enums']["status_inscricao"],"telefone"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "inscricoes_edicao_id_fkey"
      columns: ["edicao_id"]
isOneToOne: false
      referencedRelation: "edicoes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "inscricoes_formulario_id_fkey"
      columns: ["formulario_id"]
isOneToOne: false
      referencedRelation: "formularios"
      referencedColumns: ["id"]
    }
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
                },"membros": {
                  Row: {
                    "ativo": boolean,"atualizado_em": string,"cidade": string | null,"criado_em": string,"edicao_id": string,"id": string,"idade": number | null,"inscricao_id": string | null,"nascimento": string | null,"nivel": Database["public"]['Enums']["nivel_membro"] | null,"nome": string,"observacoes": string | null,"sexo": Database["public"]['Enums']["sexo"],"telefone": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "ativo"?: boolean,"atualizado_em"?: string,"cidade"?: string | null,"criado_em"?: string,"edicao_id": string,"id"?: string,"idade"?: number | null,"inscricao_id"?: string | null,"nascimento"?: string | null,"nivel"?: Database["public"]['Enums']["nivel_membro"] | null,"nome": string,"observacoes"?: string | null,"sexo": Database["public"]['Enums']["sexo"],"telefone"?: string | null
                  }
                  Update: {
                    "ativo"?: boolean,"atualizado_em"?: string,"cidade"?: string | null,"criado_em"?: string,"edicao_id"?: string,"id"?: string,"idade"?: number | null,"inscricao_id"?: string | null,"nascimento"?: string | null,"nivel"?: Database["public"]['Enums']["nivel_membro"] | null,"nome"?: string,"observacoes"?: string | null,"sexo"?: Database["public"]['Enums']["sexo"],"telefone"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "membros_edicao_id_fkey"
      columns: ["edicao_id"]
isOneToOne: false
      referencedRelation: "edicoes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "membros_inscricao_id_fkey"
      columns: ["inscricao_id"]
isOneToOne: true
      referencedRelation: "inscricoes"
      referencedColumns: ["id"]
    }
                  ]
                },"perguntas": {
                  Row: {
                    "ajuda": string | null,"criado_em": string,"formulario_id": string,"id": string,"obrigatoria": boolean,"opcoes": NonNullable<Json>,"ordem": number,"rotulo": string,"tipo": Database["public"]['Enums']["tipo_pergunta"]
                  }
                  ComputedFields: never
                  Insert: {
                    "ajuda"?: string | null,"criado_em"?: string,"formulario_id": string,"id"?: string,"obrigatoria"?: boolean,"opcoes"?: NonNullable<Json>,"ordem"?: number,"rotulo": string,"tipo": Database["public"]['Enums']["tipo_pergunta"]
                  }
                  Update: {
                    "ajuda"?: string | null,"criado_em"?: string,"formulario_id"?: string,"id"?: string,"obrigatoria"?: boolean,"opcoes"?: NonNullable<Json>,"ordem"?: number,"rotulo"?: string,"tipo"?: Database["public"]['Enums']["tipo_pergunta"]
                  }
                  Relationships: [
                    {
      foreignKeyName: "perguntas_formulario_id_fkey"
      columns: ["formulario_id"]
isOneToOne: false
      referencedRelation: "formularios"
      referencedColumns: ["id"]
    }
                  ]
                },"profiles": {
                  Row: {
                    "ativo": boolean,"atualizado_em": string,"criado_em": string,"email": string | null,"id": string,"nome": string,"papel": Database["public"]['Enums']["papel_usuario"],"precisa_trocar_senha": boolean,"telefone": string | null,"usuario": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "ativo"?: boolean,"atualizado_em"?: string,"criado_em"?: string,"email"?: string | null,"id": string,"nome": string,"papel"?: Database["public"]['Enums']["papel_usuario"],"precisa_trocar_senha"?: boolean,"telefone"?: string | null,"usuario"?: string | null
                  }
                  Update: {
                    "ativo"?: boolean,"atualizado_em"?: string,"criado_em"?: string,"email"?: string | null,"id"?: string,"nome"?: string,"papel"?: Database["public"]['Enums']["papel_usuario"],"precisa_trocar_senha"?: boolean,"telefone"?: string | null,"usuario"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"rate_limits": {
                  Row: {
                    "chave": string,"contagem": number,"janela_inicio": string
                  }
                  ComputedFields: never
                  Insert: {
                    "chave": string,"contagem"?: number,"janela_inicio": string
                  }
                  Update: {
                    "chave"?: string,"contagem"?: number,"janela_inicio"?: string
                  }
                  Relationships: [
                    
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "ativar_edicao":
{ Args: { "p_id": string }; Returns: undefined
                           },
"consumir_rate_limit":
{ Args: { "p_chave": string,"p_janela_segundos": number,"p_limite": number }; Returns: boolean
                           },
"duplicar_edicao":
{ Args: { "p_ano": number,"p_nome": string,"p_origem": string }; Returns: string
                           },
"formulario_publico":
{ Args: { "p_slug": string }; Returns: Json
                           },
"hoje_belem":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"is_edg":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"is_staff":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"normalizar_telefone":
{ Args: { "p": string }; Returns: string
                           },
"papel_atual":
{ Args: Record<PropertyKey, never>; Returns: Database["public"]['Enums']["papel_usuario"]
                           },
"puxar_para_equipe":
{ Args: { "p_ids": (string)[] }; Returns: number
                           },
"registrar_log":
{ Args: { "p_acao": string,"p_dados"?: Json,"p_descricao"?: string,"p_entidade": string,"p_entidade_id"?: string }; Returns: undefined
                           },
"situacao_formulario":
{ Args: { "p_id": string }; Returns: string
                           }
          }
          Enums: {
            "nivel_membro": "iniciante"|"intermediario"|"avancado","papel_usuario": "edg"|"coordenador"|"membro","sexo": "masculino"|"feminino","status_inscricao": "pendente"|"em_analise"|"selecionado"|"lista_espera"|"nao_selecionado","tipo_pergunta": "texto_curto"|"texto_longo"|"multipla"|"caixas"|"sim_nao"|"escala"|"lista"
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
            "nivel_membro": ["iniciante", "intermediario", "avancado"],"papel_usuario": ["edg", "coordenador", "membro"],"sexo": ["masculino", "feminino"],"status_inscricao": ["pendente", "em_analise", "selecionado", "lista_espera", "nao_selecionado"],"tipo_pergunta": ["texto_curto", "texto_longo", "multipla", "caixas", "sim_nao", "escala", "lista"]
          }
        }
} as const
