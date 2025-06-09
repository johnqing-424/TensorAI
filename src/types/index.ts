// RAGFlow API相关的类型定义

// 基本响应类型
export interface ApiResponse<T> {
    code: number;
    message?: string;
    data?: T;
    error?: any; // 添加error字段用于存储详细错误信息
}

// 聊天消息类型
export interface ChatMessage {
    id?: string;          // 消息唯一标识符
    role: "user" | "assistant" | "system";
    content: string;
    isLoading?: boolean;  // 标记消息是否处于加载状态
    isError?: boolean;    // 标记消息是否为错误消息
    timestamp?: number;   // 时间戳，用于强制React识别组件更新
    completed?: boolean;  // 标记消息是否已完成生成
    reference?: Reference; // 添加引用信息字段，用于存储消息的参考文档
}

// 聊天引用源类型
export interface ReferenceChunk {
    id: string;
    content: string | null;  // 与RAGFlow原生版本保持一致，允许null值
    document_id: string;
    document_name: string;
    dataset_id: string;
    image_id: string;
    similarity: number;
    vector_similarity: number;
    term_similarity: number;
    positions: number[];  // 与RAGFlow原生版本保持一致，使用number[]
    highlight?: string;
    doc_type?: string;  // 添加可选的 doc_type 属性
}

// 聊天引用类型
export interface Reference {
    total: number;
    chunks: ReferenceChunk[];
    doc_aggs: Array<{
        doc_name: string;
        doc_id: string;
        count: number;
        url?: string;  // 添加可选的 url 属性
    }>;
}

// 聊天会话类型
export interface ChatSession {
    id: string;
    name: string;
    messages: {
        role: "user" | "assistant" | "system";
        content: string;
        metadata?: any | null;
        reference?: string | null;
    }[];
    create_time?: number;
    update_time?: number;
    chat_id?: string;
    create_date?: string;
    update_date?: string;
}

// 数据集/知识库类型
export interface Dataset {
    id: string;
    name: string;
    avatar: string;
    description: string | null;
    chunk_num: number;
    doc_num: number;
    language: string;
    embd_id: string;
    parser_id: string;
    permission: string;
    create_date: string;
    update_date: string;
    token_num: number;
    status: string;
    tenant_id: string;
    pagerank: number;
    create_time: number;
    update_time: number;
    parser_config: Record<string, any>;
}

// 聊天助手类型
export interface ChatAssistant {
    id: string;
    name: string;
    avatar: string;
    datasets: Dataset[];
    description: string;
    llm: {
        model_name: string;
        temperature: number;
        top_p: number;
        presence_penalty: number;
        frequency_penalty: number;
    };
    prompt: {
        similarity_threshold: number;
        keywords_similarity_weight: number;
        top_n: number;
        variables: Array<{
            key: string;
            optional: boolean;
        }>;
        rerank_model: string;
        empty_response: string;
        opener: string;
        prompt: string;
        keyword?: boolean;
        show_quote?: boolean;
        reasoning?: boolean;
        refine_multiturn?: boolean;
        tts?: boolean;
        use_kg?: boolean;
    };
    create_date: string;
    update_date: string;
    status: string;
    do_refer?: string;
    language?: string;
    tenant_id?: string;
    top_k?: number;
    create_time?: number;
    update_time?: number;
    prompt_type?: string;
}

// 完成聊天请求的类型
export interface ChatCompletionRequest {
    question: string;
    stream?: boolean;
    session_id?: string;
    user_id?: string;
}

// 流式聊天响应类型
export interface StreamChatResponse {
    answer: string;
    reference?: Reference;
    id?: string;
    session_id: string;
    audio_binary?: null;
}

// 聊天完成后的完整响应类型
export interface ChatCompletion {
    answer: string;
    reference?: Reference;
    audio_binary?: null;
    id?: string;
    session_id: string;
}