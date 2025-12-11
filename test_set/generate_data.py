import json
import csv
import random
import datetime
import math
import os

# Configuration
START_DATE = datetime.date(2025, 1, 1)
DURATION_DAYS = 60
MEASUREMENT_INTERVAL_DAYS = 3
USER_ID = "user_simulated_001"
EXPERIMENT_ID = "exp_simulated_001"

# Treatments
# 1: Control (Normal)
# 2: Sequía (Drought)
# 3: Fertilizante (Fertilizer)
# 4: Sequía + Fertilizante (Mixed)

# Growth parameters (Sigmoid curve parameters: L / (1 + exp(-k * (t - t0))))
# Adjusted for variety
POTS_CONFIG = {
    '1': {'name': 'Control',              'L_h': 150, 'k_h': 0.1,  't0_h': 30, 'L_w': 300, 'k_w': 0.12, 't0_w': 35},
    '2': {'name': 'Sequía',               'L_h': 100, 'k_h': 0.08, 't0_h': 35, 'L_w': 180, 'k_w': 0.10, 't0_w': 40},
    '3': {'name': 'Fertilizante',         'L_h': 180, 'k_h': 0.12, 't0_h': 28, 'L_w': 350, 'k_w': 0.15, 't0_w': 32},
    '4': {'name': 'Sequía + Fertilizante','L_h': 120, 'k_h': 0.09, 't0_h': 32, 'L_w': 220, 'k_w': 0.11, 't0_w': 38},
}

IMAGE_DIR = "test_set/Frente"
# Assuming images are named 1.png through 12.png
# We will map experiment progress (0-100%) to image index (0-11)
AVAILABLE_IMAGES = [f"{i}.png" for i in range(1, 13)]

def sigmoid(t, L, k, t0):
    return L / (1 + math.exp(-k * (t - t0)))

def get_image_for_day(day, total_days):
    # Map day to image index
    idx = int((day / total_days) * (len(AVAILABLE_IMAGES) - 1))
    return f"{IMAGE_DIR}/{AVAILABLE_IMAGES[idx]}"

def generate_data():
    entries = []
    
    current_date = START_DATE
    
    for day in range(0, DURATION_DAYS + 1, MEASUREMENT_INTERVAL_DAYS):
        
        # Determine current phase for notes
        if day < 10:
            phase = "Germinación"
        elif day < 21:
            phase = "Primeras Hojas / Adaptación"
        elif day < 45:
            phase = "Crecimiento Vegetativo"
        else:
            phase = "Floración / Fructificación"

        entry = {
            "id": f"entry_{day}",
            "userId": USER_ID,
            "date": current_date.isoformat(),
            "dayNumber": day,
            "pots": {},
            "generalNotes": f"Día {day}: Fase de {phase}. Registro de rutina."
        }

        for pot_id, config in POTS_CONFIG.items():
            # Calculate height with some noise
            base_height = sigmoid(day, config['L_h'], config['k_h'], config['t0_h'])
            height = base_height + random.uniform(-1, 1)
            if height < 0: height = 0
            
            # Calculate weight (biomass + pot/soil base weight)
            # Base pot+soil weight approx 500g, fluctuates with water
            water_fluctuation = random.uniform(-20, 20) # Watering effect
            base_weight_biomass = sigmoid(day, config['L_w'], config['k_w'], config['t0_w'])
            total_weight = 500 + base_weight_biomass + water_fluctuation

            # Visual status logic
            visual_status = "Saludable"
            if "Sequía" in config['name'] and day > 25:
                 if random.random() > 0.5:
                     visual_status = "Hojas levemente caídas"
            
            # Image mapping
            # In a real scenario, each pot would have different photos. 
            # Here we reuse the set for demonstration, maybe off-setting slightly or just using same.
            # Let's just use the same progression for all to ensure valid file paths.
            img_path = get_image_for_day(day, DURATION_DAYS)

            entry["pots"][pot_id] = {
                "weight": round(total_weight, 1),
                "height": round(height, 1),
                "visualStatus": visual_status,
                "ph": round(random.uniform(6.0, 7.5), 1),
                "notes": f"Tratamiento: {config['name']}",
                "images": {
                    "front": img_path
                }
            }

        entries.append(entry)
        current_date += datetime.timedelta(days=MEASUREMENT_INTERVAL_DAYS)
        
    return entries

def save_json(data, filename="simulated_data.json"):
    with open(filename, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    print(f"JSON saved to {filename}")

def save_csv(data, filename="simulated_data.csv"):
    with open(filename, 'w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        writer.writerow(["Date", "Day", "PotID", "Treatment", "Weight", "Height", "pH", "VisualStatus", "Image"])
        
        for entry in data:
            date = entry['date']
            day = entry['dayNumber']
            for pot_id, pot_data in entry['pots'].items():
                treatment_name = POTS_CONFIG[pot_id]['name']
                writer.writerow([
                    date,
                    day,
                    pot_id,
                    treatment_name,
                    pot_data['weight'],
                    pot_data['height'],
                    pot_data['ph'],
                    pot_data['visualStatus'],
                    pot_data['images']['front']
                ])
    print(f"CSV saved to {filename}")

if __name__ == "__main__":
    data = generate_data()
    save_json(data)
    save_csv(data)
