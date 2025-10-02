# Northern Cebu Earthquake Relief Map Guide

A comprehensive web-based mapping solution to help relief workers and volunteers navigate to earthquake-affected areas in northern Cebu, Philippines. This interactive map guide provides real-time road conditions, evacuation center information, and route planning capabilities for the areas affected by the magnitude 6.7/6.9 earthquake.

## 🌟 Features

### Interactive Map
- **Real-time Road Conditions**: Visual representation of passable, blocked, and under-repair roads
- **Barangay & Town Markers**: Detailed information for all affected municipalities
- **Evacuation Centers**: Locations, capacity, and current occupancy status
- **Hospital Locations**: Medical facilities with operational status
- **Route Planning**: Interactive route planning with turn-by-turn directions

### Key Locations Covered
- **Towns**: Daanbantayan, Bogo City, Medellin, Tabogon, Borbon, Sogod, Catmon, Carmen
- **Major Barangays**: Poblacion areas and key affected communities
- **Critical Infrastructure**: Hospitals, evacuation centers, emergency services

### Road Status Categories
- 🟢 **Passable**: Roads clear and safe for all vehicles
- 🔴 **Blocked**: Roads impassable due to damage or debris
- 🟡 **Under Repair**: Roads with ongoing emergency repairs
- 🟠 **Partially Blocked**: Limited access, suitable for emergency vehicles only

## 🚀 Quick Start

### Option 1: Direct File Opening
1. Download all files to your computer
2. Open `index.html` in any modern web browser
3. The map will load automatically with all data

### Option 2: Local Web Server (Recommended)
```bash
# Using Python 3
python -m http.server 8000

# Using Node.js (if you have it installed)
npx serve .

# Using PHP
php -S localhost:8000
```

Then open `http://localhost:8000` in your browser.

## 📱 How to Use

### Navigation Controls
- **All Roads**: Show all road segments regardless of condition
- **Passable Roads**: Filter to show only accessible routes
- **Blocked Roads**: Display damaged or impassable roads
- **Evacuation Centers**: Toggle evacuation center markers
- **Plan Route**: Interactive route planning tool

### Search Functionality
- Use the search box to find specific barangays or towns
- Search is case-insensitive and supports partial matches
- Examples: "Daanbantayan", "Bogo", "Poblacion"

### Route Planning
1. Click the "Plan Route" button
2. Click on the map to set your starting point
3. Click on any destination marker to calculate the route
4. The system will show the best available path considering road conditions

### Information Panels
- Click on any marker to see detailed information
- Road segments show current condition and last update time
- Evacuation centers display capacity and available facilities
- Hospitals show operational status and available services

## 🗺️ Map Data

### Coverage Area
- **Primary Focus**: Northern Cebu municipalities affected by the earthquake
- **Coordinates**: Approximately 10.5°N to 11.3°N, 123.9°E to 124.1°E
- **Map Provider**: OpenStreetMap (free and open source)

### Data Sources
- Municipal disaster response teams
- Philippine National Disaster Risk Reduction and Management Council (NDRRMC)
- Local government units
- Relief organization reports

### Update Frequency
- Road conditions: Updated as reports come in
- Evacuation centers: Real-time capacity updates when possible
- Emergency contacts: Verified daily

## 📞 Emergency Contacts

### National
- **NDRRMC Hotline**: 911
- **Philippine Red Cross**: 143

### Local (Cebu)
- **Cebu Provincial Disaster**: (032) 266-5841
- **Red Cross Cebu**: (032) 418-2550
- **Bogo District Hospital**: (032) 251-4000
- **Daanbantayan District Hospital**: (032) 437-0123

## 🛠️ Technical Details

### Technologies Used
- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Mapping**: Leaflet.js v1.9.4
- **Routing**: Leaflet Routing Machine v3.2.12
- **Icons**: Font Awesome 6.4.0
- **Responsive Design**: CSS Grid and Flexbox

### Browser Compatibility
- ✅ Chrome 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Edge 90+
- ✅ Mobile browsers (iOS Safari, Chrome Mobile)

### Performance
- Lightweight: ~500KB total size
- Fast loading: Optimized for slow connections
- Mobile-friendly: Responsive design for all screen sizes
- Offline-capable: Core functionality works without internet

## 🔧 Customization

### Adding New Locations
Edit the `locationData` object in `script.js`:

```javascript
// Add new town
locationData.towns.push({
    name: "New Town",
    coords: [latitude, longitude],
    status: "affected", // severely_affected, affected, moderately_affected
    population: 12345,
    evacuationCenters: 2,
    roadCondition: "passable" // passable, blocked, under_repair
});
```

### Updating Road Conditions
Modify the `roadSegments` array in `script.js`:

```javascript
// Update existing road
{
    name: "Road Name",
    coords: [[lat1, lng1], [lat2, lng2]],
    condition: "blocked", // passable, blocked, under_repair, partially_blocked
    type: "highway" // highway, secondary, coastal
}
```

### Styling Modifications
- Main styles: `styles.css`
- Color scheme: CSS custom properties at the top of the file
- Responsive breakpoints: Media queries at the bottom

## 📊 Data Structure

### Location Data Format
```javascript
{
    name: "Location Name",
    coords: [latitude, longitude],
    status: "affected", // Impact level
    roadCondition: "passable", // Current accessibility
    notes: "Additional information"
}
```

### Road Segment Format
```javascript
{
    name: "Road Name",
    coords: [[start_lat, start_lng], [end_lat, end_lng]],
    condition: "passable", // Current condition
    type: "highway" // Road classification
}
```

## 🤝 Contributing

### Reporting Updates
If you have updated information about road conditions or new evacuation centers:

1. Contact local disaster response coordinators
2. Verify information with multiple sources
3. Include GPS coordinates when possible
4. Note the time and date of observation

### Technical Contributions
- Fork the repository
- Make your changes
- Test thoroughly
- Submit with detailed description of changes

## ⚠️ Important Notes

### Data Accuracy
- Information is updated as reports are received
- Road conditions can change rapidly during emergency situations
- Always verify current conditions before traveling
- Prioritize official emergency communications

### Safety Guidelines
- Do not attempt to travel on roads marked as "blocked"
- Carry emergency supplies when traveling to affected areas
- Coordinate with local authorities before entering disaster zones
- Have backup communication methods available

### Limitations
- GPS accuracy may vary in mountainous areas
- Some remote barangays may not have real-time updates
- Weather conditions can affect road accessibility beyond earthquake damage

## 📄 License

This project is released under the MIT License for emergency relief purposes. Feel free to use, modify, and distribute to help earthquake relief efforts.

## 🆘 Support

For technical issues or data updates:
- Contact local emergency management offices
- Reach out to disaster response coordinators
- Check official government disaster response websites

---

**Last Updated**: October 2024  
**Version**: 1.0  
**Maintained by**: Emergency Response Web Development Team

*This map guide is designed to assist relief efforts for the Northern Cebu earthquake response. Please prioritize official emergency communications and coordinate with local authorities.*
