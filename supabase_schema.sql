-- 1. Enable UUID Extension (jika diperlukan)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Tabel Pengaturan (Settings)
CREATE TABLE IF NOT EXISTS public.settings (
    user_id TEXT PRIMARY KEY,
    templates TEXT[] NOT NULL DEFAULT '{}',
    ai_memory TEXT DEFAULT '',
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Tabel Kategori (Tags)
CREATE TABLE IF NOT EXISTS public.tags (
    id TEXT PRIMARY KEY, -- ID unik gabungan 'user.uid_tagname' untuk kompatibilitas
    name TEXT NOT NULL,
    user_id TEXT NOT NULL,
    count INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Tabel Kemenangan (Wins)
CREATE TABLE IF NOT EXISTS public.wins (
    id TEXT PRIMARY KEY, -- ID unik acak dari client
    user_id TEXT NOT NULL,
    text TEXT NOT NULL,
    tags TEXT[] NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    starred BOOLEAN NOT NULL DEFAULT FALSE,
    pinned BOOLEAN NOT NULL DEFAULT FALSE,
    is_habit_mode BOOLEAN NOT NULL DEFAULT FALSE,
    is_be_do_have BOOLEAN NOT NULL DEFAULT FALSE,
    be_text TEXT DEFAULT '',
    do_text TEXT DEFAULT '',
    have_text TEXT DEFAULT '',
    image_url TEXT,
    reflections TEXT DEFAULT '',
    embedding FLOAT8[], -- Menyimpan array embedding untuk riset semantik
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Buat index untuk mempercepat pencarian data berdasarkan user_id
CREATE INDEX IF NOT EXISTS idx_wins_user_id ON public.wins(user_id);
CREATE INDEX IF NOT EXISTS idx_tags_user_id ON public.tags(user_id);

-- 5. Tabel Bintang Obrolan (Chat Stars)
CREATE TABLE IF NOT EXISTS public.chat_stars (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    user_prompt TEXT NOT NULL,
    ai_response TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_chat_stars_user_id ON public.chat_stars(user_id);

-- 6. Tabel Log Token (Token Logs)
CREATE TABLE IF NOT EXISTS public.token_logs (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    user_id TEXT NOT NULL,
    function_name TEXT NOT NULL,
    input_tokens INTEGER NOT NULL DEFAULT 0,
    output_tokens INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_token_logs_user_id ON public.token_logs(user_id);
