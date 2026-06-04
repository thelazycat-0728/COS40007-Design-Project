import requests
import json
import pandas as pd
import matplotlib.pyplot as plt
from bs4 import BeautifulSoup
from datetime import datetime

# Fetch the page
url = "https://data.gov.my/dashboard/vehicle-registrations"
headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
}

print("Fetching data from:", url)
response = requests.get(url, headers=headers)
response.raise_for_status()

# Parse HTML and extract JSON from script tag
soup = BeautifulSoup(response.content, 'html.parser')
script_tag = soup.find('script', {'id': '__NEXT_DATA__'})

if not script_tag:
    raise ValueError("Could not find __NEXT_DATA__ script tag")

# Extract and parse JSON
json_data = json.loads(script_tag.string)

# Navigate to vehicle timeseries data
vehicle_data = json_data['props']['pageProps']['vehicle_timeseries']
monthly_data = vehicle_data['data']['monthly']

# Extract timestamps and car data
timestamps = monthly_data['x']
car_timeseries = monthly_data['car']  # Car data is directly accessible

# Convert timestamps to datetime
dates = [datetime.fromtimestamp(ts / 1000).strftime('%Y-%m') for ts in timestamps]

# Create DataFrame
df = pd.DataFrame({
    'Date': dates,
    'Car_Registrations': car_timeseries
})

# Save to CSV
csv_filename = 'car_registrations.csv'
df.to_csv(csv_filename, index=False)
print(f"\nData saved to: {csv_filename}")
print(f"Total records: {len(df)}")
print("\nFirst few rows:")
print(df.head())

# Create a presentable line graph
plt.figure(figsize=(14, 6))
plt.plot(range(len(df)), df['Car_Registrations'], linewidth=2, color='#2E86AB', marker='o', markersize=3)
plt.title('Monthly Car Registrations in Malaysia', fontsize=16, fontweight='bold')
plt.xlabel('Month', fontsize=12)
plt.ylabel('Number of Car Registrations', fontsize=12)
plt.grid(True, alpha=0.3)

# Format x-axis to show dates periodically
tick_positions = range(0, len(df), max(1, len(df)//10))
tick_labels = [df['Date'].iloc[i] for i in tick_positions]
plt.xticks(tick_positions, tick_labels, rotation=45, ha='right')

# Format y-axis with commas for readability
ax = plt.gca()
ax.yaxis.set_major_formatter(plt.FuncFormatter(lambda x, p: f'{int(x):,}'))

plt.tight_layout()
plt.savefig('car_registrations_graph.png', dpi=300, bbox_inches='tight')
print("Graph saved as: car_registrations_graph.png")
plt.show()
