const canvas: HTMLCanvasElement = document.getElementById('canvas') as HTMLCanvasElement;
const ctx: CanvasRenderingContext2D = canvas.getContext('2d')!;

function resizeCanvas(): void {
    canvas.width = window.innerWidth - 10;
    canvas.height = window.innerHeight - 10;
}

function generateRandomColor(): string {
    return "rgb(" + Math.floor(Math.random() * 255) + "," + Math.floor(Math.random() * 255) + "," + Math.floor(Math.random() * 255) + ")";
}

function getMostMassivePlanet(): Planet {
    return planets.reduce((max, p) => (p.mass > max.mass ? p : max), planets[0]);
}

resizeCanvas();

window.addEventListener('resize', resizeCanvas);

// Physikalische Konstanten und Zeitskalierung
const G: number = 6.67430e-11;       // Gravitationskonstante in m^3/(kg·s²)
const dt: number = 86400;            // Zeitschritt: 86400 s = 1 Tag pro Frame
const distanceScale: number = 1e9;   // 1 Pixel entspricht 1×10⁹ m

const planets: Planet[] = [];

const logDiv: HTMLElement = document.getElementById('log')!;

function logMessage(message: string): void {
    const p: HTMLParagraphElement = document.createElement('p');
    p.textContent = message;
    p.classList.add('log-message');
    logDiv.appendChild(p);
    logDiv.scrollTop = logDiv.scrollHeight;
}

interface Velocity {
    x: number;
    y: number;
}

interface TrailPoint {
    x: number;
    y: number;
    life: number;
}

class Planet {
    x: number;
    y: number;
    radius: number;
    color: string;
    mass: number;
    velocity: Velocity;
    name: string;
    trail: TrailPoint[];

    constructor(x: number, y: number, radius: number, color: string, mass: number, velocity: Velocity, name: string) {
        this.x = x;
        this.y = y;
        this.radius = radius;
        this.color = color;
        this.mass = mass;
        this.velocity = velocity;
        this.name = name;
        this.trail = [];
    }

    draw(): void {
        const centerPlanet: Planet = getMostMassivePlanet();

        const relativeX: number = (this.x - centerPlanet.x) / distanceScale;
        const relativeY: number = (this.y - centerPlanet.y) / distanceScale;

        const canvasX: number = canvas.width / 2 + relativeX;
        const canvasY: number = canvas.height / 2 + relativeY;

        drawTrail(this, centerPlanet);

        ctx.beginPath();
        ctx.arc(canvasX, canvasY, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();
        ctx.closePath();
    }

    applyGravity(other: Planet): void {
        const dx: number = other.x - this.x;
        const dy: number = other.y - this.y;
        let distance: number = Math.sqrt(dx * dx + dy * dy);
        distance = Math.max(distance, 1e7);

        const force: number = (G * this.mass * other.mass) / (distance * distance);
        const angle: number = Math.atan2(dy, dx);
        const forceX: number = Math.cos(angle) * force;
        const forceY: number = Math.sin(angle) * force;

        this.velocity.x += (forceX / this.mass) * dt;
        this.velocity.y += (forceY / this.mass) * dt;
    }

    checkCollision(other: Planet): void {
        const dx: number = other.x - this.x;
        const dy: number = other.y - this.y;
        const distance: number = Math.sqrt(dx * dx + dy * dy);
        if (distance <= (this.radius + other.radius) * distanceScale) {
            logMessage(`${this.name} kollidiert und fusioniert mit ${other.name}`);
            const newMass: number = this.mass + other.mass;
            const newRadius: number = Math.sqrt(this.radius * this.radius + other.radius * other.radius);
            const newVelocity: Velocity = {
                x: (this.velocity.x * this.mass + other.velocity.x * other.mass) / newMass,
                y: (this.velocity.y * this.mass + other.velocity.y * other.mass) / newMass
            };
            const newX: number = (this.x * this.mass + other.x * other.mass) / newMass;
            const newY: number = (this.y * this.mass + other.y * other.mass) / newMass;

            const fusedPlanet: Planet = new Planet(newX, newY, newRadius, this.color, newMass, newVelocity, `${this.name}-${other.name}`);
            logMessage(`Neuer Planet: mit Masse ${fusedPlanet.mass.toExponential(3)} kg`);

            const indexThis: number = planets.indexOf(this);
            const indexOther: number = planets.indexOf(other);
            if (indexOther > -1) planets.splice(indexOther, 1);
            if (indexThis > -1) planets.splice(indexThis, 1, fusedPlanet);
        }
    }

    update(): void {
        for (let other of planets) {
            if (other !== this) {
                this.applyGravity(other);
                this.checkCollision(other);
            }
        }
        this.x += this.velocity.x * dt;
        this.y += this.velocity.y * dt;

        this.trail.push({x: this.x, y: this.y, life: 1.0});
        const fadeSpeed: number = 0.005;
        for (let i = 0; i < this.trail.length; i++) {
            this.trail[i].life -= fadeSpeed;
        }
        while (this.trail.length && this.trail[0].life <= 0) {
            this.trail.shift();
        }
    }
}

const playPauseBtn: HTMLElement = document.getElementById('play-pause-btn')!;
let isPaused: boolean = false;

playPauseBtn.addEventListener('click', () => {
    isPaused = !isPaused;
    playPauseBtn.textContent = isPaused ? "Play" : "Pause";
    logMessage(isPaused ? "Simulation paused" : "Simulation resumed");
});

const resetBtn: HTMLElement = document.getElementById('reset-btn')!;
resetBtn.addEventListener('click', () => {
    planets.splice(0, planets.length);
    logMessage("Simulation reset");
});

function animate(): void {
    if (!isPaused) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        planets.forEach(planet => {
            planet.update();
            planet.draw();
        });
    }
    requestAnimationFrame(animate);
}

function drawTrail(planet: Planet, centerPlanet: Planet): void {
    if (planet.trail.length < 2) return;
    ctx.lineWidth = 2;
    ctx.lineCap = "round";

    for (let i = 0; i < planet.trail.length - 1; i++) {
        const p1: TrailPoint = planet.trail[i];
        const p2: TrailPoint = planet.trail[i + 1];

        let c1x: number = canvas.width / 2 + (p1.x - centerPlanet.x) / distanceScale;
        let c1y: number = canvas.height / 2 + (p1.y - centerPlanet.y) / distanceScale;
        let c2x: number = canvas.width / 2 + (p2.x - centerPlanet.x) / distanceScale;
        let c2y: number = canvas.height / 2 + (p2.y - centerPlanet.y) / distanceScale;

        const alpha: number = (p1.life + p2.life) / 2;
        ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
        ctx.beginPath();
        ctx.moveTo(c1x, c1y);
        ctx.lineTo(c2x, c2y);
        ctx.stroke();
    }
}

document.getElementById('spawn-btn')!.addEventListener('click', () => {
    const mass: number = parseFloat((document.getElementById('mass-input') as HTMLInputElement).value);
    const radius: number = parseFloat((document.getElementById('radius-input') as HTMLInputElement).value);
    const velocityX: number = parseFloat((document.getElementById('velocity-x-input') as HTMLInputElement).value);
    const velocityY: number = parseFloat((document.getElementById('velocity-y-input') as HTMLInputElement).value);
    const distancePx: number = parseFloat((document.getElementById('distance-input') as HTMLInputElement).value);

    if (isNaN(mass) || isNaN(radius) || isNaN(velocityX) || isNaN(velocityY) || isNaN(distancePx)) {
        logMessage("Invalid input! Please enter valid numbers.");
        return;
    }

    const centerPlanet: Planet = getMostMassivePlanet();

    const distanceFromCenter: number = distancePx * distanceScale;

    const posX: number = centerPlanet ? centerPlanet.x + distanceFromCenter : canvas.width / 2 + distanceFromCenter;
    const posY: number = centerPlanet ? centerPlanet.y : canvas.height / 2;

    const newPlanet: Planet = new Planet(
        posX, posY,
        radius,
        generateRandomColor(),
        mass,
        {x: velocityX, y: velocityY},
        `Planet-${planets.length + 1}`
    );

    planets.push(newPlanet);
    if (centerPlanet) {
        logMessage(`Spawned ${newPlanet.name} at ${distancePx} px (${distanceFromCenter.toExponential(2)} m) from ${centerPlanet.name ?? "blank"}.`);
    } else {
        logMessage(`Spawned new Center Planet.`);
    }
});

const spawnSolarSystemBtn: HTMLElement = document.getElementById('spawn-solar-system-btn')!;
spawnSolarSystemBtn.addEventListener('click', spawnSolarSystem);

function spawnSolarSystem(): void {
    // Clear existing planets
    planets.splice(0, planets.length);

    // Sun (slight momentum on x-axis)
    const sun = new Planet(0, 0, 20, 'yellow', 1.989e30, {x: 10000, y: 0}, 'Sun');
    planets.push(sun);

    // Mercury
    const mercury = new Planet(5.79e10, 0, 2, 'gray', 3.285e23, {x: 0, y: 47870}, 'Mercury');
    planets.push(mercury);

    // Venus
    const venus = new Planet(1.082e11, 0, 5, 'orange', 4.867e24, {x: 0, y: 35020}, 'Venus');
    planets.push(venus);

    // Earth
    const earth = new Planet(1.496e11, 0, 5, 'blue', 5.972e24, {x: 0, y: 29780}, 'Earth');
    planets.push(earth);

    // Mars
    const mars = new Planet(2.279e11, 0, 3, 'red', 6.39e23, {x: 0, y: 24070}, 'Mars');
    planets.push(mars);

    logMessage("Solar System spawned with Sun, Mercury, Venus, Earth, and Mars");
}


logMessage("Hallo Herr Viering");
logMessage("Collision detection and fusion of planets enabled");
logMessage("Pause/Play simulation with the top center button.");
animate();
