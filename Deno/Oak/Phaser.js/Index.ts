import { Application, Router } from "https://deno.land/x/oak/mod.ts";

const app = new Application();
const router = new Router();

// In-memory DB
const scores: { playerName: string; score: number; date: Date }[] = [];

// Get high scores
router.get("/high-scores", (context) => {
  const topScores = [...scores]
    .sort((a, b) => b.score - a.score)
    .slice(0, 10)
    .map(({ playerName, score }) => ({ playerName, score }));

  context.response.body = topScores;
  context.response.status = 200;
});

// Save a score
router.post("/save-score", async (context) => {
  const body = await context.request.body().value;
  const { playerName, score } = body;

  if (typeof playerName !== "string" || typeof score !== "number") {
    context.response.status = 400;
    context.response.body = { message: "Invalid data" };
    return;
  }

  scores.push({ playerName, score, date: new Date() });
  context.response.status = 201;
  context.response.body = { message: "Score saved!" };
});

// Serve game (unchanged)
router.get("/", (context) => {
  context.response.headers.set("content-type", "text/html");
  context.response.body = `        document.getElementById('down').addEventListener('touchstart', () => moveDown = true);
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
  </html> `;
});

// Apply routes and start server
app.use(router.routes());
app.use(router.allowedMethods());

console.log("Server running at http://localhost:8000");
await app.listen({ port: 8000 });
