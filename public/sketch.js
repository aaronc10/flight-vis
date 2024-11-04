let data;
let countries = {};
let currentDate;
let circles = [];
let osc;
let env;

let oscillators = [];
let envelopes = [];
const MAX_VOICES = 4;
const bMinorScale = [
  246.94, 277.18, 293.66, 329.63, 369.99, 392.00, 440.00,  // B3 to A4
  493.88, 554.37, 587.33, 659.25, 739.99, 783.99, 880.00,  // B4 to A5
  987.77, 1108.73, 1174.66, 1318.51, 1479.98, 1567.98, 1760.00  // B5 to A6
];

const colorPalette = [
  [0, 100, 255],    // blue
  [135, 206, 235],  // light blue
  [75, 0, 130],     // indigo
  [255, 255, 0],    // yellow
  [144, 238, 144],  // light green
  [255, 192, 203]   // pink
];


let startDate;
let endDate;

let flashTimer = 0;
const flashInterval = 100; // Time in milliseconds between flashes

function preload() {
  data = loadTable('MigData.csv', 'csv', 'header', 
    () => console.log('Data loaded successfully'), 
    (error) => console.error('Error loading data:', error)
  );
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  background(255, 100);
  noStroke();
  
  // Initialize oscillators and envelopes
  for (let i = 0; i < MAX_VOICES; i++) {
    let osc = new p5.Oscillator('sine');
    osc.start();
    osc.amp(0);
    oscillators.push(osc);

    let env = new p5.Envelope();
    env.setADSR(0.1, 0.2, 0.2, 0.9);
    env.setRange(0.05, 0);
    envelopes.push(env);
  }

  // Process data
  if (data && data.rows) {
    for (let row of data.rows) {
      if (row.obj) {
        let dateStr = row.getString('Report Date');
        console.log(dateStr);
        let country = row.getString('Country or Area Name');
        console.log(country);
        let count = row.getNum('Daily Arrivals Total');
        console.log(count);
        
        if (dateStr && country && !isNaN(count)) {
          if (!countries[country]) {
            countries[country] = {
              x: random(width),
              y: random(height)
            };
          }
          
          if (!countries[country][dateStr]) {
            countries[country][dateStr] = count;
          }
        } else {
          console.error('Invalid row data:', row.obj);
        }
      } else {
        console.error('Invalid row:', row);
      }
    }
  } else {
    console.error('Data not loaded properly');
  }
  
  currentDate = new Date('2024-01-01');
  
  // Log the processed data for debugging
  console.log('Processed countries data:', countries);
}

function draw() {
  // Create a semi-transparent background to allow for fading effects
  background(0, 0, 0, 90);

  // Check if it's time to flash
  flashTimer += deltaTime; // deltaTime gives the time since the last frame
  if (flashTimer > flashInterval) {
    if (random() < 0.1) { // 10% chance to flash
      background(255); // Flash white
    }
    flashTimer = 0; // Reset the timer
  }

  // Randomize positions at the start of each loop
  if (currentDate.getTime() === startDate.getTime()) {
    randomizePositions();
  }

  let dateString = formatDate(currentDate);
  
  let activeCenters = [];
  for (let country in countries) {
    if (countries[country][dateString]) {
      let count = countries[country][dateString];
      let x = countries[country].x;
      let y = countries[country].y;
      let size = map(count * 2, 0, 1000, 100, 200);
      
      circles.push(new Circle(x, y, size));
      activeCenters.push(createVector(x, y));
    }
  }

  // Create new paths
  if (activeCenters.length > 1) {
    for (let i = 0; i < 5; i++) {
      let startCircle = random(circles);
      let endCircle = random(circles);
      if (startCircle !== endCircle) {
        paths.push(new Path(
          startCircle.x, 
          startCircle.y, 
          endCircle.x, 
          endCircle.y,
          startCircle.color
        ));
      }
    }
  }

  // Update and display paths
  for (let i = paths.length - 1; i >= 0; i--) {
    paths[i].display();
    if (paths[i].isDead()) {
      paths.splice(i, 1);
    }
  }

  // Update and display circles
  for (let i = circles.length - 1; i >= 0; i--) {
    circles[i].update();
    circles[i].display();
    if (circles[i].isDead()) {
      circles.splice(i, 1);
    }
  }

  // Move to the next day
  currentDate.setDate(currentDate.getDate() + 1);
  
  // If we've reached the end date, loop back to the start date
  if (currentDate > endDate) {
    currentDate = new Date(startDate);
  }
  
  // Display current date
  fill(255);
  textSize(24);
  text(dateString, 10, 30);
}

function formatDate(date) {
  return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
}

function randomizePositions() {
  for (let country in countries) {
    countries[country].x = random(width);
    countries[country].y = random(height);
  }
}

class Circle {
  constructor(x, y, size) {
    this.x = x;
    this.y = y;
    this.size = size;
    this.opacity = 205;
    this.growth = 2;
    this.color = random(colorPalette);
    this.playSound();
  }
  
  update() {
    this.size += this.growth;
    this.opacity -= 18;
  }
  
  display() {
    noFill();
    let [r, g, b] = this.color;
    stroke(r, g, b, this.opacity);
    drawingContext.shadowColor = color(r, g, b, this.opacity);
    drawingContext.shadowBlur = 2000;
    ellipse(this.x, this.y, this.size);
  }
  
  isDead() {
    return this.opacity <= 0;
  }

  playSound() {
    let majorScale = [262, 294, 330, 349, 392, 440, 494, 523];
    let index = floor(random(map(this.size, 20, 400, -7, 7)));
    let freq = bMinorScale[index];
    // let freq = majorScale[index];
    
    // Find an available voice
    let voiceIndex = oscillators.findIndex(osc => osc.amp().value === 0);
    if (voiceIndex === -1) voiceIndex = floor(random(MAX_VOICES));

    oscillators[voiceIndex].freq(freq);
    envelopes[voiceIndex].play(oscillators[voiceIndex]);
  }
}

class Path {
  constructor(startX, startY, endX, endY, color) {
    this.start = createVector(startX, startY);
    this.end = createVector(endX, endY);
    this.points = this.generatePoints();
    this.opacity = 50;
    this.color = color || random(colorPalette);
  }

  display() {
    let [r, g, b] = this.color;
    stroke(r, g, b, this.opacity);
    
    beginShape();
    for (let point of this.points) {
      vertex(point.x, point.y);
    }
    endShape();
    this.opacity -= 2;
  }

  generatePoints() {
    let points = [this.start];
    let current = this.start.copy();
    let target = this.end.copy();
    while (p5.Vector.dist(current, target) > 5) {
      let direction = p5.Vector.sub(target, current);
      direction.normalize();
      direction.rotate(random(-PI/8, PI/8));
      direction.mult(random(20));
      current.add(direction);
      points.push(current.copy());
    }
    points.push(this.end);
    return points;
  }

  display() {
    stroke(this.color, 50);
    noFill();
    beginShape();
    for (let point of this.points) {
      vertex(point.x, point.y);
    }
    endShape();
    this.opacity -= 1;
    
  }

  isDead() {
    return this.opacity <= 0;
  }
}

startDate = new Date('2024-01-01');
endDate = new Date('2024-07-01');
currentDate = new Date(startDate);

let paths = [];
