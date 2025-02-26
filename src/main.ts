const canvas: HTMLCanvasElement = document.getElementById('canvas') as HTMLCanvasElement;
const ctx: CanvasRenderingContext2D = canvas.getContext('2d')!;
const deltaTimeElement: HTMLElement | null = document.querySelector('.deltaTime');

// Physikalische Konstanten und Zeitskalierung
const G: number = 6.67430e-11;       // Gravitationskonstante in m^3/(kg·s²)
let dt: number = 86400;            // Zeitschritt: 86400 s = 1 Tag pro Frame
const distanceScale: number = 1e9;   // 1 Pixel entspricht 1×10⁹ m

// Globale Variablen
let isPaused: boolean = false;
const planets: Planet[] = [];

function getDist(p1: Point, p2: Point): number {
    const dx = p1.x - p2.x;
    const dy = p1.y - p2.y;
    return Math.sqrt(dx * dx + dy * dy);
}

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

function deletePlanets(x: number, y: number): void {
    for (let i = planets.length - 1; i >= 0; i--) {
        const distance = getDist({x, y}, planets[i].getPosition());
        if (distance <= planets[i].radius + 10) {
            planets.splice(i, 1);
            logMessage(`Deleted planet ${planets[i].name} at (${x}, ${y})`);
        }
    }
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

function logMessage(message: string): void {
    const p: HTMLParagraphElement = document.createElement('p');
    p.textContent = message;
    p.classList.add('log-message');
    logDiv?.appendChild(p);
    logDiv!.scrollTop = logDiv!.scrollHeight;
}

function animate(): void {
    if (!isPaused) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        for (let i = 0; i < planets.length; i++) {
            planets[i].update();
            planets[i].draw();
        }
    }
    requestAnimationFrame(animate);
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

interface Point {
    x: number,
    y: number
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
    fadeSpeed: number;

    constructor(x: number, y: number, radius: number, color: string, mass: number, velocity: Velocity, name: string) {
        this.x = x;
        this.y = y;
        this.radius = radius;
        this.color = color;
        this.mass = mass;
        this.velocity = velocity;
        this.name = name;
        this.trail = [];
        this.fadeSpeed = 0.005;
    }

    draw(): void {
        const {x: canvasX, y: canvasY, centerPlanet} = this.getPosition();

        drawTrail(this, centerPlanet);

        ctx.beginPath();
        ctx.arc(canvasX, canvasY, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();
        ctx.closePath();
    }

    getPosition() {
        const centerPlanet: Planet = getMostMassivePlanet();

        const relativeX: number = (this.x - centerPlanet.x) / distanceScale;
        const relativeY: number = (this.y - centerPlanet.y) / distanceScale;

        const canvasX: number = canvas.width / 2 + relativeX;
        const canvasY: number = canvas.height / 2 + relativeY;

        return {x: canvasX, y: canvasY, centerPlanet};
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

            const fusedPlanet: Planet = new Planet(newX, newY, newRadius, this.color, newMass, newVelocity, `${this.name}+${other.name}`);
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
        for (let i = 0; i < this.trail.length; i++) {
            this.trail[i].life -= this.fadeSpeed;
        }
        while (this.trail.length && this.trail[0].life <= 0) {
            this.trail.shift(); //delete obsolete trail lines
        }
    }
}

const playPauseBtn: HTMLElement | null = document.getElementById('play-pause-btn');
const resetBtn: HTMLElement | null = document.getElementById('reset-btn');
const spawnSolarSystemBtn: HTMLElement | null = document.getElementById('spawn-solar-system-btn');
const spawnPlanetBtn: HTMLElement | null = document.getElementById('spawn-btn');
const logDiv: HTMLElement | null = document.getElementById('log');

playPauseBtn?.addEventListener('click', () => {
    isPaused = !isPaused;
    playPauseBtn.textContent = isPaused ? "Play" : "Stop";
    canvas.classList.toggle('white-border');
    logMessage(isPaused ? "Simulation paused" : "Simulation resumed");
});
resetBtn?.addEventListener('click', () => {
    planets.splice(0, planets.length);
    logMessage("Simulation reset");
});
spawnSolarSystemBtn?.addEventListener('click', spawnSolarSystem);
spawnPlanetBtn?.addEventListener('click', () => {
    const mass: number = parseFloat((document.getElementById('mass-input') as HTMLInputElement).value);
    const radius: number = parseFloat((document.getElementById('radius-input') as HTMLInputElement).value);
    const velocityX: number = parseFloat((document.getElementById('velocity-x-input') as HTMLInputElement).value);
    const velocityY: number = parseFloat((document.getElementById('velocity-y-input') as HTMLInputElement).value);
    const distancePx: number = parseFloat((document.getElementById('distance-input') as HTMLInputElement).value);
    const name: string = (document.getElementById('name-input') as HTMLInputElement).value;

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
        name
    );

    planets.push(newPlanet);
    if (centerPlanet) {
        logMessage(`Spawned ${newPlanet.name} at ${distancePx} px (${distanceFromCenter.toExponential(2)} m) from ${centerPlanet.name ?? "blank"}.`);
    } else {
        logMessage(`Spawned new Center Planet.`);
    }
});
deltaTimeElement?.addEventListener('input', () => {
    dt = parseFloat((deltaTimeElement as HTMLInputElement).value);
});

window.addEventListener('click', (event: MouseEvent) => {
    deletePlanets(event.clientX, event.clientY);
})
window.addEventListener('resize', resizeCanvas);

logMessage("Hallo Herr Viering");
logMessage("The planet with the most mass is the center planet.");
logMessage("Pause/Play simulation with the right center button.");
logMessage("1px corresponds to 1×10⁹ m in the simulation.");
logMessage("12e12 corresponds to 12×10¹² m in the simulation.");
logMessage("To delete a planet click on it. (easier when paused)");

resizeCanvas();
animate();
