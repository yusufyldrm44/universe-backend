const db = require('./db');

const createTables = async () => {
  const queries = [
    `CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      full_name VARCHAR(150) NOT NULL,
      university_email VARCHAR(255) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      university VARCHAR(255),
      department VARCHAR(255),
      avatar_url TEXT,
      bio TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,

    `CREATE TABLE IF NOT EXISTS listings (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      type VARCHAR(20) NOT NULL CHECK (type IN ('item','house','roommate','job')),
      title VARCHAR(255) NOT NULL,
      description TEXT,
      price NUMERIC(10,2),
      location VARCHAR(255),
      images TEXT[],
      status VARCHAR(20) DEFAULT 'active',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,

    `CREATE TABLE IF NOT EXISTS events (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title VARCHAR(255) NOT NULL,
      description TEXT,
      location VARCHAR(255),
      event_date TIMESTAMP NOT NULL,
      capacity INTEGER,
      image_url TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,

    `CREATE TABLE IF NOT EXISTS news (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      title VARCHAR(255) NOT NULL,
      content TEXT NOT NULL,
      category VARCHAR(100),
      image_url TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,

    `CREATE TABLE IF NOT EXISTS chat_rooms (
      id SERIAL PRIMARY KEY,
      user1_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      user2_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user1_id, user2_id)
    )`,

    `CREATE TABLE IF NOT EXISTS messages (
      id SERIAL PRIMARY KEY,
      room_id INTEGER NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
      sender_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      content TEXT NOT NULL,
      is_read BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,

    `CREATE TABLE IF NOT EXISTS follows (
      id SERIAL PRIMARY KEY,
      follower_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      following_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(follower_id, following_id),
      CHECK (follower_id <> following_id)
    )`,

    `CREATE TABLE IF NOT EXISTS event_participants (
      id SERIAL PRIMARY KEY,
      event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(event_id, user_id)
    )`,

    `CREATE TABLE IF NOT EXISTS forum_topics (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      category VARCHAR(50) NOT NULL DEFAULT 'genel',
      title VARCHAR(200) NOT NULL,
      content TEXT NOT NULL,
      is_pinned BOOLEAN DEFAULT FALSE,
      view_count INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )`,

    `CREATE TABLE IF NOT EXISTS forum_replies (
      id SERIAL PRIMARY KEY,
      topic_id INTEGER REFERENCES forum_topics(id) ON DELETE CASCADE,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      content TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    )`,

    `CREATE TABLE IF NOT EXISTS forum_likes (
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      topic_id INTEGER REFERENCES forum_topics(id) ON DELETE CASCADE,
      PRIMARY KEY (user_id, topic_id)
    )`
  ];

  const alterQueries = [
    `ALTER TABLE listings ADD COLUMN IF NOT EXISTS city VARCHAR(100)`,
    `ALTER TABLE listings ADD COLUMN IF NOT EXISTS condition VARCHAR(50)`,
    `ALTER TABLE listings ADD COLUMN IF NOT EXISTS extra_data JSONB`,
    `ALTER TABLE listings ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'user'`,
    `ALTER TABLE listings ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'pending'`,
    `ALTER TABLE events ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'pending'`,
    `ALTER TABLE listings DROP CONSTRAINT IF EXISTS listings_type_check`,
    `ALTER TABLE listings ADD CONSTRAINT listings_type_check CHECK (type IN ('item','house','roommate','job','internship'))`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS bio TEXT`,
    `ALTER TABLE forum_topics ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]'`
  ];

  try {
    for (const q of queries) {
      await db.query(q);
    }
    console.log('Tüm tablolar başarıyla oluşturuldu');

    for (const q of alterQueries) {
      await db.query(q);
    }
    console.log('Sütun güncellemeleri tamamlandı (city, condition, extra_data, view_count, role, status)');

    process.exit(0);
  } catch (err) {
    console.error('Migration hatası:', err);
    process.exit(1);
  }
};

createTables();
