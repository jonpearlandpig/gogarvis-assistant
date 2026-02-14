
-- Fix akb_drafts: drop restrictive policies, recreate as permissive
DROP POLICY IF EXISTS "akb_drafts_select_own" ON public.akb_drafts;
DROP POLICY IF EXISTS "akb_drafts_insert_own" ON public.akb_drafts;
DROP POLICY IF EXISTS "akb_drafts_update_own" ON public.akb_drafts;

CREATE POLICY "akb_drafts_select_own" ON public.akb_drafts FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "akb_drafts_insert_own" ON public.akb_drafts FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "akb_drafts_update_own" ON public.akb_drafts FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Fix akb_uploads: same issue
DROP POLICY IF EXISTS "akb_uploads_select_own" ON public.akb_uploads;
DROP POLICY IF EXISTS "akb_uploads_insert_own" ON public.akb_uploads;

CREATE POLICY "akb_uploads_select_own" ON public.akb_uploads FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "akb_uploads_insert_own" ON public.akb_uploads FOR INSERT WITH CHECK (user_id = auth.uid());

-- Fix akb_conflicts
DROP POLICY IF EXISTS "akb_conflicts_select_own" ON public.akb_conflicts;
DROP POLICY IF EXISTS "akb_conflicts_insert_own" ON public.akb_conflicts;
DROP POLICY IF EXISTS "akb_conflicts_update_own" ON public.akb_conflicts;

CREATE POLICY "akb_conflicts_select_own" ON public.akb_conflicts FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "akb_conflicts_insert_own" ON public.akb_conflicts FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "akb_conflicts_update_own" ON public.akb_conflicts FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Fix akb_proof_gates
DROP POLICY IF EXISTS "akb_proof_gates_select_own" ON public.akb_proof_gates;
DROP POLICY IF EXISTS "akb_proof_gates_insert_own" ON public.akb_proof_gates;
DROP POLICY IF EXISTS "akb_proof_gates_update_own" ON public.akb_proof_gates;

CREATE POLICY "akb_proof_gates_select_own" ON public.akb_proof_gates FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "akb_proof_gates_insert_own" ON public.akb_proof_gates FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "akb_proof_gates_update_own" ON public.akb_proof_gates FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Fix akb_law
DROP POLICY IF EXISTS "akb_law_select_own" ON public.akb_law;
DROP POLICY IF EXISTS "akb_law_insert_own" ON public.akb_law;

CREATE POLICY "akb_law_select_own" ON public.akb_law FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "akb_law_insert_own" ON public.akb_law FOR INSERT WITH CHECK (user_id = auth.uid());

-- Fix akb_extractions
DROP POLICY IF EXISTS "akb_extractions_select_own" ON public.akb_extractions;
DROP POLICY IF EXISTS "akb_extractions_insert_own" ON public.akb_extractions;

CREATE POLICY "akb_extractions_select_own" ON public.akb_extractions FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "akb_extractions_insert_own" ON public.akb_extractions FOR INSERT WITH CHECK (user_id = auth.uid());

-- Fix akb_canon
DROP POLICY IF EXISTS "akb_canon_select_own" ON public.akb_canon;
DROP POLICY IF EXISTS "akb_canon_insert_own" ON public.akb_canon;

CREATE POLICY "akb_canon_select_own" ON public.akb_canon FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "akb_canon_insert_own" ON public.akb_canon FOR INSERT WITH CHECK (user_id = auth.uid());
