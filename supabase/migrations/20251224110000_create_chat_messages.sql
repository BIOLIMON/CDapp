-- Create chat_messages table
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  role TEXT CHECK (role IN ('user', 'assistant')) NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Policies
-- Allow users to insert messages for themselves
CREATE POLICY "Users can insert their own messages" ON public.chat_messages
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Allow users to view their own messages
CREATE POLICY "Users can view their own messages" ON public.chat_messages
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Allow specific roles (like god/admin) to view all messages if needed, 
-- but for now sticking to user privacy.

-- Grants
GRANT ALL ON public.chat_messages TO authenticated;
GRANT ALL ON public.chat_messages TO service_role;
