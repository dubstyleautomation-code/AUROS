-- ============================================================
-- AUROS MKT — Schema Inicial
-- Migration: schema_inicial_auros
-- Criado em: Abril 2026
-- ============================================================

-- ============================================================
-- 1. RESTAURANTES (tenant raiz)
-- ============================================================
CREATE TABLE restaurants (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  slug        TEXT UNIQUE NOT NULL,
  plan        TEXT NOT NULL DEFAULT 'starter'
                CHECK (plan IN ('starter', 'pro', 'enterprise')),
  owner_id    UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE restaurants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "dono_ve_proprio_restaurante" ON restaurants
  FOR ALL USING (owner_id = auth.uid());

CREATE INDEX idx_restaurants_owner ON restaurants(owner_id);
CREATE INDEX idx_restaurants_slug  ON restaurants(slug);

-- ============================================================
-- 2. BRAND CONTEXTS
-- ============================================================
CREATE TABLE brand_contexts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id   UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  tone            TEXT NOT NULL,
  avoid_words     TEXT[]   DEFAULT '{}',
  hashtags        TEXT[]   DEFAULT '{}',
  personas        JSONB    DEFAULT '[]',
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE brand_contexts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "restaurante_ve_proprio_brand_context" ON brand_contexts
  FOR ALL USING (
    restaurant_id IN (SELECT id FROM restaurants WHERE owner_id = auth.uid())
  );

CREATE UNIQUE INDEX idx_brand_contexts_restaurant ON brand_contexts(restaurant_id);

-- ============================================================
-- 3. CLIENTES
-- ============================================================
CREATE TABLE customers (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id   UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  email           TEXT,
  phone           TEXT,
  birthday        DATE,
  preferences     JSONB DEFAULT '{}',
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "restaurante_ve_proprios_clientes" ON customers
  FOR ALL USING (
    restaurant_id IN (SELECT id FROM restaurants WHERE owner_id = auth.uid())
  );

CREATE INDEX idx_customers_restaurant ON customers(restaurant_id);
CREATE INDEX idx_customers_birthday   ON customers(EXTRACT(MONTH FROM birthday));

-- ============================================================
-- 4. VISITAS
-- ============================================================
CREATE TABLE visits (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id   UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  customer_id     UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  visited_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  party_size      INT,
  avg_ticket      NUMERIC(10, 2),
  notes           TEXT
);

ALTER TABLE visits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "restaurante_ve_proprias_visitas" ON visits
  FOR ALL USING (
    restaurant_id IN (SELECT id FROM restaurants WHERE owner_id = auth.uid())
  );

CREATE INDEX idx_visits_restaurant      ON visits(restaurant_id);
CREATE INDEX idx_visits_customer        ON visits(customer_id);
CREATE INDEX idx_visits_visited_at      ON visits(visited_at DESC);
CREATE INDEX idx_visits_restaurant_date ON visits(restaurant_id, visited_at DESC);

-- ============================================================
-- 5. CONTEÚDOS GERADOS PELA IA
-- ============================================================
CREATE TABLE generated_contents (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id   UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  type            TEXT NOT NULL
                    CHECK (type IN ('caption', 'story', 'email', 'campaign', 'review_response')),
  content         TEXT NOT NULL,
  model_used      TEXT NOT NULL,
  prompt_version  TEXT NOT NULL,
  approved_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE generated_contents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "restaurante_ve_proprios_conteudos" ON generated_contents
  FOR ALL USING (
    restaurant_id IN (SELECT id FROM restaurants WHERE owner_id = auth.uid())
  );

CREATE INDEX idx_contents_restaurant ON generated_contents(restaurant_id);
CREATE INDEX idx_contents_type       ON generated_contents(restaurant_id, type);

-- ============================================================
-- 6. AVALIAÇÕES
-- ============================================================
CREATE TABLE reviews (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id   UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  platform        TEXT NOT NULL
                    CHECK (platform IN ('google', 'tripadvisor', 'ifood', 'manual')),
  rating          INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  content         TEXT,
  reviewer_name   TEXT,
  external_id     TEXT,
  responded_at    TIMESTAMPTZ,
  response        TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(platform, external_id)
);

ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "restaurante_ve_proprias_reviews" ON reviews
  FOR ALL USING (
    restaurant_id IN (SELECT id FROM restaurants WHERE owner_id = auth.uid())
  );

CREATE INDEX idx_reviews_restaurant ON reviews(restaurant_id);
CREATE INDEX idx_reviews_rating     ON reviews(restaurant_id, rating);

-- ============================================================
-- 7. CAMPANHAS
-- ============================================================
CREATE TABLE campaigns (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id   UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  segment         TEXT NOT NULL
                    CHECK (segment IN ('aniversariante_mes','inativo_60d','vip','novo','recorrente','todos')),
  channel         TEXT NOT NULL CHECK (channel IN ('email', 'whatsapp', 'sms')),
  template        TEXT NOT NULL,
  scheduled_at    TIMESTAMPTZ,
  sent_count      INT DEFAULT 0,
  status          TEXT NOT NULL DEFAULT 'draft'
                    CHECK (status IN ('draft', 'scheduled', 'sent', 'paused')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "restaurante_ve_proprias_campanhas" ON campaigns
  FOR ALL USING (
    restaurant_id IN (SELECT id FROM restaurants WHERE owner_id = auth.uid())
  );

CREATE INDEX idx_campaigns_restaurant ON campaigns(restaurant_id);
CREATE INDEX idx_campaigns_status     ON campaigns(restaurant_id, status);

-- ============================================================
-- 8. ENVIOS DE CAMPANHA
-- ============================================================
CREATE TABLE campaign_sends (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id   UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  customer_id   UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  sent_at       TIMESTAMPTZ,
  opened_at     TIMESTAMPTZ,
  converted_at  TIMESTAMPTZ,
  status        TEXT DEFAULT 'pending'
                  CHECK (status IN ('pending', 'sent', 'failed', 'bounced'))
);

ALTER TABLE campaign_sends ENABLE ROW LEVEL SECURITY;

CREATE POLICY "restaurante_ve_proprios_envios" ON campaign_sends
  FOR ALL USING (
    campaign_id IN (
      SELECT c.id FROM campaigns c
      JOIN restaurants r ON r.id = c.restaurant_id
      WHERE r.owner_id = auth.uid()
    )
  );

CREATE INDEX idx_sends_campaign ON campaign_sends(campaign_id);
CREATE INDEX idx_sends_customer ON campaign_sends(customer_id);

-- ============================================================
-- 9. AI CORPUS LOGS
-- ============================================================
CREATE TABLE ai_corpus_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id   UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  model           TEXT NOT NULL,
  prompt_version  TEXT NOT NULL,
  input_tokens    INT,
  output_tokens   INT,
  content_type    TEXT NOT NULL,
  metadata        JSONB DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE ai_corpus_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "restaurante_ve_proprios_logs" ON ai_corpus_logs
  FOR ALL USING (
    restaurant_id IN (SELECT id FROM restaurants WHERE owner_id = auth.uid())
  );

CREATE INDEX idx_corpus_restaurant   ON ai_corpus_logs(restaurant_id);
CREATE INDEX idx_corpus_content_type ON ai_corpus_logs(content_type);
CREATE INDEX idx_corpus_created_at   ON ai_corpus_logs(created_at DESC);

-- ============================================================
-- TRIGGERS — updated_at automático
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_restaurants_updated_at
  BEFORE UPDATE ON restaurants
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_customers_updated_at
  BEFORE UPDATE ON customers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- TRIGGER — Alerta de review negativo via Realtime
-- ============================================================
CREATE OR REPLACE FUNCTION notify_negative_review()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.rating <= 3 THEN
    PERFORM pg_notify(
      'negative_review',
      json_build_object(
        'review_id',      NEW.id,
        'restaurant_id',  NEW.restaurant_id,
        'rating',         NEW.rating,
        'platform',       NEW.platform
      )::text
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_notify_negative_review
  AFTER INSERT OR UPDATE ON reviews
  FOR EACH ROW EXECUTE FUNCTION notify_negative_review();

-- ============================================================
-- VIEW — North Star Metric: clientes ativos 60 dias
-- ============================================================
CREATE OR REPLACE VIEW active_customers_60d AS
SELECT
  c.id,
  c.restaurant_id,
  c.name,
  c.email,
  c.phone,
  c.birthday,
  c.preferences,
  COUNT(v.id)        AS total_visitas,
  MAX(v.visited_at)  AS ultima_visita,
  AVG(v.avg_ticket)  AS ticket_medio
FROM customers c
JOIN visits v ON v.customer_id = c.id
WHERE v.visited_at >= NOW() - INTERVAL '60 days'
GROUP BY c.id;
