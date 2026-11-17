CREATE DATABASE IF NOT EXISTS alr_store
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_0900_ai_ci;

-- Create a dedicated least-privilege app account with a private password, then grant
-- SELECT, INSERT, UPDATE, DELETE, CREATE, ALTER, INDEX, and REFERENCES on alr_store.*.
-- Do not use the MySQL root account for the running application.
