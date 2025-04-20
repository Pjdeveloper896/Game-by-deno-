import { Application, Router } from "https://deno.land/x/oak/mod.ts";
import { DB } from "https://deno.land/x/sqlite/mod.ts"; // Stable SQLite module

const app = new Application();
const router = new Router();

// Initialize SQLite database
const db = new DB("game_scores.db");

// Create table for storing game scores if it doesn't exist
db.query(`
  CREATE TABLE IF NOT EXISTS game_scores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    player_name TEXT,
    score INTEGER,
    date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )
`);

// Fetch the high scores
router.get("/high-scores", async (context) => {
  const result = db.query("SELECT player_name, score FROM game_scores ORDER BY score DESC LIMIT 10");
  const highScores = result.map((row) => ({
    playerName: row[0],
    score: row[1],
  }));

  context.response.body = highScores;
  context.response.status = 200;
});

// Save the score to SQLite
router.post("/save-score", async (context) => {
  const body = await context.request.body().value;
  const { playerName, score } = body;

  // Insert the score into SQLite
  db.query("INSERT INTO game_scores (player_name, score) VALUES (?, ?)", [playerName, score]);

  context.response.status = 201;
  context.response.body = { message: "Score saved!" };
});

// Serve the game (existing code)
router.get("/", (context) => {
  context.response.headers.set("content-type", "text/html");
  context.response.body = `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
    <title>Iron Man Game</title>
    <script src="https://cdn.jsdelivr.net/npm/phaser@3.70.0/dist/phaser.min.js"></script>
    <style>
      #controls {
        position: absolute;
        bottom: 20px;
        left: 50%;
        transform: translateX(-50%);
        display: flex;
        gap: 20px;
        z-index: 1;
      }
      .btn {
        width: 60px;
        height: 60px;
        background: rgba(255, 255, 255, 0.2);
        color: white;
        font-size: 30px;
        text-align: center;
        line-height: 60px;
        border-radius: 50%;
        user-select: none;
      }
      body {
        margin: 0;
        overflow: hidden;
      }
      canvas {
        display: block;
      }
      #lives, #score, #highScore {
        position: absolute;
        left: 20px;
        font-size: 30px;
        color: white;
      }
      #lives {
        top: 20px;
      }
      #score {
        top: 60px;
      }
      #highScore {
        top: 100px;
      }
    </style>
  </head>
  <body>
    <div id="controls">
      <div class="btn" id="left">←</div>
      <div class="btn" id="up">↑</div>
      <div class="btn" id="right">→</div>
      <div class="btn" id="shoot">🔫</div>
      <div class="btn" id="down">↓</div>
    </div>
    <div id="lives">Lives: 3</div>
    <div id="score">Score: 0</div>
    <div id="highScore">High Score: 0</div>

    <script>
      let moveLeft = false;
      let moveRight = false;
      let jump = false;
      let moveDown = false;
      let shoot = false;
      let lives = 3;
      let score = 0;
      let highScore = localStorage.getItem('highScore') || 0;
      document.getElementById('highScore').textContent = 'High Score: ' + highScore;

      let bullets, enemies;
      let spawnRate = 2000;
      let enemySpeed = 200;

      const config = {
        type: Phaser.AUTO,
        width: window.innerWidth,
        height: window.innerHeight,
        backgroundColor: "#000",
        physics: {
          default: 'arcade',
          arcade: {
            gravity: { y: 0 },
            debug: false
          }
        },
        scene: {
          preload: preload,
          create: create,
          update: update
        }
      };

      const game = new Phaser.Game(config);
      let player;
      let lastShotTime = 0;

      function preload() {
        this.load.spritesheet('ironman', 'https://labs.phaser.io/assets/sprites/dude.png', {
          frameWidth: 32,
          frameHeight: 48
        });
        this.load.image('bullet', 'https://labs.phaser.io/assets/sprites/ball.png');
        this.load.image('enemy', 'https://labs.phaser.io/assets/sprites/ship.png');
      }

      function create() {
        player = this.physics.add.sprite(100, 300, 'ironman');
        player.setCollideWorldBounds(true);

        this.anims.create({
          key: 'fly',
          frames: this.anims.generateFrameNumbers('ironman', { start: 0, end: 3 }),
          frameRate: 10,
          repeat: -1
        });

        this.anims.create({
          key: 'shoot',
          frames: this.anims.generateFrameNumbers('ironman', { start: 4, end: 7 }),
          frameRate: 10,
          repeat: 0
        });

        player.play('fly');

        bullets = this.physics.add.group({ defaultKey: 'bullet', maxSize: 10 });
        enemies = this.physics.add.group();

        this.physics.add.collider(bullets, enemies, hitEnemy, null, this);
        this.physics.add.collider(player, enemies, playerHit, null, this);

        this.time.addEvent({
          delay: spawnRate,
          callback: spawnEnemy,
          callbackScope: this,
          loop: true
        });

        document.getElementById('left').addEventListener('touchstart', () => moveLeft = true);
        document.getElementById('left').addEventListener('touchend', () => moveLeft = false);
        document.getElementById('right').addEventListener('touchstart', () => moveRight = true);
        document.getElementById('right').addEventListener('touchend', () => moveRight = false);
        document.getElementById('up').addEventListener('touchstart', () => jump = true);
        document.getElementById('up').addEventListener('touchend', () => jump = false);
        document.getElementById('down').addEventListener('touchstart', () => moveDown = true);
        document.getElementById('down').addEventListener('touchend', () => moveDown = false);
        document.getElementById('shoot').addEventListener('touchstart', () => shoot = true);
        document.getElementById('shoot').addEventListener('touchend', () => shoot = false);
      }

      function update(time) {
        if (moveLeft) player.setVelocityX(-200);
        else if (moveRight) player.setVelocityX(200);
        else player.setVelocityX(0);

        if (jump) player.setVelocityY(-200);
        else if (moveDown) player.setVelocityY(200);
        else player.setVelocityY(0);

        if (shoot && time - lastShotTime > 300) {
          shootBullet();
          lastShotTime = time;
        }

        bullets.getChildren().forEach(bullet => {
          if (bullet.active) {
            let trail = game.scene.scenes[0].add.circle(bullet.x, bullet.y, 3, 0x00ffff);
            trail.setAlpha(0.5);
            game.scene.scenes[0].tweens.add({
              targets: trail,
              alpha: 0,
              scale: 0,
              duration: 300,
              onComplete: () => trail.destroy()
            });
          }
        });

        enemies.getChildren().forEach(enemy => {
          if (enemy.x < 0) {
            enemy.setActive(false);
            enemy.setVisible(false);
          }
        });
      }

      function shootBullet() {
        let bullet = bullets.get(player.x + 50, player.y, 'bullet');
        if (bullet) {
          bullet.setActive(true);
          bullet.setVisible(true);
          bullet.setVelocityX(400);
          bullet.setGravityY(0);
          player.play('shoot');

          let flash = game.scene.scenes[0].add.circle(player.x + 50, player.y, 10, 0xffff00);
          flash.setDepth(1);
          game.scene.scenes[0].tweens.add({
            targets: flash,
            alpha: 0,
            duration: 100,
            onComplete: () => flash.destroy()
          });
        }
      }

      function spawnEnemy() {
        let enemy = enemies.create(window.innerWidth, Math.random() * window.innerHeight, 'enemy');
        enemy.setVelocityX(-enemySpeed);
        enemy.setScale(0.5);
      }

      function hitEnemy(bullet, enemy) {
        bullet.setActive(false);
        bullet.setVisible(false);
        enemy.setActive(false);
        enemy.setVisible(false);
        score += 10;
        document.getElementById('score').textContent = 'Score: ' + score;
        if (score > highScore) {
          highScore = score;
          localStorage.setItem('highScore', highScore);
          document.getElementById('highScore').textContent = 'High Score: ' + highScore;
        }
      }

      function playerHit(player, enemy) {
        enemy.setActive(false);
        enemy.setVisible(false);
        lives--;
        document.getElementById('lives').textContent = 'Lives: ' + lives;
        if (lives <= 0) {
          alert('Game Over! Your score: ' + score);
          score = 0;
          lives = 3;
          document.getElementById('score').textContent = 'Score: ' + score;
          document.getElementById('lives').textContent = 'Lives: ' + lives;
        }
      }
    </script>
  </body>
  </html>
  `;
});

app.use(router.routes());
app.use(router.allowedMethods());

await app.listen({ port: 8000 });
