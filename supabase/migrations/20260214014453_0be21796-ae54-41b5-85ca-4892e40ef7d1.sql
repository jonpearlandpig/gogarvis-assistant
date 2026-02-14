
-- Conversations table
CREATE TABLE public.conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL DEFAULT 'New Conversation',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

-- Messages table
CREATE TABLE public.messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Artifacts table
CREATE TABLE public.artifacts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'text',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.artifacts ENABLE ROW LEVEL SECURITY;

-- Helper function
CREATE OR REPLACE FUNCTION public.is_conversation_owner(conv_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.conversations WHERE id = conv_id AND user_id = auth.uid()
  );
$$;

-- Conversations policies
CREATE POLICY "Users can view own conversations" ON public.conversations FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can create own conversations" ON public.conversations FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own conversations" ON public.conversations FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can delete own conversations" ON public.conversations FOR DELETE USING (user_id = auth.uid());

-- Messages policies
CREATE POLICY "Users can view own messages" ON public.messages FOR SELECT USING (public.is_conversation_owner(conversation_id));
CREATE POLICY "Users can create own messages" ON public.messages FOR INSERT WITH CHECK (public.is_conversation_owner(conversation_id));
CREATE POLICY "Users can delete own messages" ON public.messages FOR DELETE USING (public.is_conversation_owner(conversation_id));

-- Artifacts policies
CREATE POLICY "Users can view own artifacts" ON public.artifacts FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can create own artifacts" ON public.artifacts FOR INSERT WITH CHECK (user_id = auth.uid() AND public.is_conversation_owner(conversation_id));
CREATE POLICY "Users can update own artifacts" ON public.artifacts FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can delete own artifacts" ON public.artifacts FOR DELETE USING (user_id = auth.uid());

-- Updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_conversations_updated_at
BEFORE UPDATE ON public.conversations
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
