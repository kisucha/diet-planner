-- =====================================================
-- init.sql
-- Diet Planner - Full Database Initialization
-- Run once before first scraper execution
-- =====================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ── 1. recipes ────────────────────────────────────
CREATE TABLE IF NOT EXISTS recipes (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    name            VARCHAR(255) NOT NULL,
    food_category   ENUM('main_dish','side_dish','special') NOT NULL DEFAULT 'main_dish',
    dish_type       ENUM('korean_dish','korean_tang','korean_jjigae','korean_guk','foreign','side','special') NOT NULL DEFAULT 'korean_dish',
    cuisine_origin  ENUM('korean','foreign') NOT NULL DEFAULT 'korean',
    is_weekend_special TINYINT(1) NOT NULL DEFAULT 0,
    instructions    TEXT,
    image_url       VARCHAR(500),
    image_local_path VARCHAR(500),
    step_image_urls TEXT,
    prep_time       VARCHAR(50),
    cook_time       VARCHAR(50),
    difficulty      VARCHAR(20),
    servings        INT DEFAULT 2,
    cuisine_type    VARCHAR(100),
    source_url      VARCHAR(500),
    source_site     VARCHAR(100),
    is_auto_fetched TINYINT(1) NOT NULL DEFAULT 0,
    scraped_at      TIMESTAMP NULL,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_food_category (food_category),
    INDEX idx_dish_type (dish_type),
    INDEX idx_cuisine_origin (cuisine_origin),
    INDEX idx_source_url (source_url(255))
);

-- ── 2. recipe_ingredients ─────────────────────────
CREATE TABLE IF NOT EXISTS recipe_ingredients (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    recipe_id       INT NOT NULL,
    ingredient_name VARCHAR(255) NOT NULL,
    quantity        DECIMAL(10,2),
    unit            VARCHAR(20),
    ingredient_type ENUM('main','seasoning') NOT NULL DEFAULT 'main',
    original_text   VARCHAR(255),
    sort_order      INT DEFAULT 0,
    FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE,
    INDEX idx_recipe_id (recipe_id),
    INDEX idx_ingredient_type (ingredient_type)
);

-- ── 3. meal_list ──────────────────────────────────
CREATE TABLE IF NOT EXISTS meal_list (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    recipe_id       INT NOT NULL,
    can_breakfast   TINYINT(1) NOT NULL DEFAULT 0,
    can_lunch       TINYINT(1) NOT NULL DEFAULT 1,
    can_dinner      TINYINT(1) NOT NULL DEFAULT 1,
    is_active       TINYINT(1) NOT NULL DEFAULT 1,
    memo            VARCHAR(255),
    added_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE,
    UNIQUE KEY uk_recipe_id (recipe_id),
    INDEX idx_can_breakfast (can_breakfast),
    INDEX idx_can_lunch (can_lunch),
    INDEX idx_can_dinner (can_dinner)
);

-- ── 4. meal_plans ─────────────────────────────────
CREATE TABLE IF NOT EXISTS meal_plans (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    plan_date       DATE NOT NULL,
    breakfast_id    INT,
    lunch_id        INT,
    dinner_id       INT,
    snack_id        INT,
    total_cost      DECIMAL(10,2),
    is_generated    TINYINT(1) NOT NULL DEFAULT 0,
    has_holiday     TINYINT(1) NOT NULL DEFAULT 0,
    holiday_key     VARCHAR(50),
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_plan_date (plan_date),
    FOREIGN KEY (breakfast_id) REFERENCES recipes(id) ON DELETE SET NULL,
    FOREIGN KEY (lunch_id)     REFERENCES recipes(id) ON DELETE SET NULL,
    FOREIGN KEY (dinner_id)    REFERENCES recipes(id) ON DELETE SET NULL,
    FOREIGN KEY (snack_id)     REFERENCES recipes(id) ON DELETE SET NULL
);

-- ── 5. meal_plan_sides ────────────────────────────
CREATE TABLE IF NOT EXISTS meal_plan_sides (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    plan_id     INT NOT NULL,
    recipe_id   INT NOT NULL,
    sort_order  INT NOT NULL DEFAULT 0,
    FOREIGN KEY (plan_id)   REFERENCES meal_plans(id) ON DELETE CASCADE,
    FOREIGN KEY (recipe_id) REFERENCES recipes(id)   ON DELETE CASCADE,
    INDEX idx_plan_id (plan_id)
);

-- ── 6. ingredient_prices ──────────────────────────
CREATE TABLE IF NOT EXISTS ingredient_prices (
    id                  INT AUTO_INCREMENT PRIMARY KEY,
    ingredient_name     VARCHAR(255) NOT NULL,
    purchase_quantity   DECIMAL(10,2) NOT NULL,
    unit                VARCHAR(20) NOT NULL,
    price               DECIMAL(10,2) NOT NULL,
    price_per_unit      DECIMAL(10,4),
    updated_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_ingredient_name (ingredient_name),
    INDEX idx_ingredient_name (ingredient_name)
);

-- ── 7. holiday_calendar ───────────────────────────
CREATE TABLE IF NOT EXISTS holiday_calendar (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    year            INT NOT NULL,
    holiday_key     VARCHAR(50) NOT NULL,
    holiday_name    VARCHAR(100) NOT NULL,
    start_date      DATE NOT NULL,
    end_date        DATE NOT NULL,
    UNIQUE KEY uk_year_holiday (year, holiday_key)
);

-- ── 8. holiday_suggestions ────────────────────────
CREATE TABLE IF NOT EXISTS holiday_suggestions (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    holiday_key     VARCHAR(50) NOT NULL,
    food_name       VARCHAR(255) NOT NULL,
    recipe_id       INT,
    description     VARCHAR(500),
    display_order   INT NOT NULL DEFAULT 0,
    FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE SET NULL,
    INDEX idx_holiday_key (holiday_key)
);

-- ── 9. weekend_specials ───────────────────────────
CREATE TABLE IF NOT EXISTS weekend_specials (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    food_name       VARCHAR(255) NOT NULL,
    recipe_id       INT,
    description     VARCHAR(500),
    is_active       TINYINT(1) NOT NULL DEFAULT 1,
    display_order   INT NOT NULL DEFAULT 0,
    FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE SET NULL
);

-- ── 10. external_api_keys ─────────────────────────
CREATE TABLE IF NOT EXISTS external_api_keys (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    service_name    VARCHAR(100) NOT NULL,
    api_key         VARCHAR(500),
    extra_key       VARCHAR(500),
    is_active       TINYINT(1) NOT NULL DEFAULT 1,
    last_tested     TIMESTAMP,
    test_result     VARCHAR(255),
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_service_name (service_name)
);

-- ── 11. scrape_progress (scraper 전용) ────────────
CREATE TABLE IF NOT EXISTS scrape_progress (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    run_date        DATE NOT NULL,
    status          ENUM('running','completed','failed','stopped') NOT NULL DEFAULT 'running',
    last_page       INT NOT NULL DEFAULT 1,
    last_category   VARCHAR(20) NOT NULL DEFAULT 'all',
    scraped_today   INT NOT NULL DEFAULT 0,
    saved_today     INT NOT NULL DEFAULT 0,
    image_saved     INT NOT NULL DEFAULT 0,
    skipped_today   INT NOT NULL DEFAULT 0,
    error_today     INT NOT NULL DEFAULT 0,
    daily_limit     INT NOT NULL DEFAULT 10000,
    started_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    finished_at     TIMESTAMP NULL,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_run_date (run_date),
    INDEX idx_status (status)
);

SET FOREIGN_KEY_CHECKS = 1;

SELECT 'Database initialization complete.' AS result;
