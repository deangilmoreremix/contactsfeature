const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// Territory definitions (would be configurable in production)
const TERRITORIES = {
  'northwest': {
    states: ['WA', 'OR', 'ID', 'MT', 'WY', 'AK'],
    regions: ['Pacific Northwest'],
    timezone: 'PST'
  },
  'southwest': {
    states: ['CA', 'NV', 'UT', 'AZ', 'NM', 'HI'],
    regions: ['Southwest', 'Western US'],
    timezone: 'PST/PST'
  },
  'mountain': {
    states: ['CO', 'WY', 'MT', 'ID', 'UT'],
    regions: ['Mountain West'],
    timezone: 'MST'
  },
  'central': {
    states: ['TX', 'OK', 'KS', 'NE', 'SD', 'ND', 'MN', 'IA', 'MO', 'AR', 'LA'],
    regions: ['Central US', 'Midwest', 'South Central'],
    timezone: 'CST'
  },
  'southeast': {
    states: ['FL', 'GA', 'AL', 'MS', 'TN', 'NC', 'SC', 'KY', 'WV', 'VA'],
    regions: ['Southeast', 'South Atlantic'],
    timezone: 'EST'
  },
  'northeast': {
    states: ['NY', 'PA', 'NJ', 'CT', 'RI', 'MA', 'VT', 'NH', 'ME', 'MD', 'DE'],
    regions: ['Northeast', 'Mid-Atlantic'],
    timezone: 'EST'
  },
  'international': {
    countries: ['CA', 'MX', 'GB', 'DE', 'FR', 'JP', 'AU', 'CN'],
    regions: ['International'],
    timezone: 'Various'
  }
};

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: 'Method not allowed'
    };
  }

  try {
    const { contact } = JSON.parse(event.body);

    console.log('Processing geographic territory assignment for contact:', contact.id);

    // Determine territory based on location data
    const territory = await determineTerritory(contact);

    if (territory) {
      // Assign territory to contact
      const { error } = await supabase
        .from('contacts')
        .update({
          territory: territory.name,
          territoryAssignmentDate: new Date().toISOString(),
          timezone: territory.timezone,
          region: territory.region
        })
        .eq('id', contact.id);

      if (error) throw error;

      // Assign to appropriate sales rep
      await assignSalesRepresentative(contact, territory);

      console.log(`Assigned contact ${contact.id} to territory: ${territory.name}`);

      return {
        statusCode: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Allow-Methods': 'POST, OPTIONS'
        },
        body: JSON.stringify({
          territoryAssigned: territory.name,
          salesRepAssigned: territory.salesRep,
          timezone: territory.timezone,
          region: territory.region
        })
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        territoryAssigned: false,
        message: 'Insufficient location data for territory assignment'
      })
    };
  } catch (error) {
    console.error('Territory assignment failed:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Territory assignment failed',
        details: error.message
      })
    };
  }
};

async function determineTerritory(contact) {
  // Check for explicit territory assignment first
  if (contact.territory) {
    return {
      name: contact.territory,
      region: contact.region || 'Unknown',
      timezone: contact.timezone || 'Unknown',
      salesRep: await getSalesRepForTerritory(contact.territory)
    };
  }

  // Determine based on address/state/country
  let territoryName = null;
  let region = null;
  let timezone = null;

  if (contact.country && contact.country !== 'US') {
    // International contact
    territoryName = 'international';
    region = 'International';
    timezone = 'Various';
  } else if (contact.state) {
    // US state-based assignment
    territoryName = getTerritoryByState(contact.state);
    if (territoryName) {
      const territory = TERRITORIES[territoryName];
      region = territory.regions[0];
      timezone = territory.timezone;
    }
  } else if (contact.city || contact.zipCode) {
    // City/ZIP based assignment
    territoryName = await getTerritoryByLocation(contact.city, contact.zipCode);
    if (territoryName) {
      const territory = TERRITORIES[territoryName];
      region = territory.regions[0];
      timezone = territory.timezone;
    }
  }

  if (territoryName) {
    return {
      name: territoryName,
      region,
      timezone,
      salesRep: await getSalesRepForTerritory(territoryName)
    };
  }

  return null;
}

function getTerritoryByState(state) {
  for (const [territoryName, territory] of Object.entries(TERRITORIES)) {
    if (territory.states && territory.states.includes(state.toUpperCase())) {
      return territoryName;
    }
  }
  return null;
}

async function getTerritoryByLocation(city, zipCode) {
  try {
    // Use Google Maps Geocoding API or OpenAI web search
    const googleMapsApiKey = process.env.GOOGLE_MAPS_API_KEY;

    if (googleMapsApiKey) {
      let geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?key=${googleMapsApiKey}`;

      if (zipCode) {
        geocodeUrl += `&components=postal_code:${zipCode}`;
      } else if (city) {
        geocodeUrl += `&address=${encodeURIComponent(city)}`;
      }

      const response = await fetch(geocodeUrl);

      if (response.ok) {
        const data = await response.json();
        if (data.results && data.results.length > 0) {
          const location = data.results[0];
          const addressComponents = location.address_components;

          // Extract state from geocoding results
          const stateComponent = addressComponents.find(component =>
            component.types.includes('administrative_area_level_1')
          );

          if (stateComponent) {
            return getTerritoryByState(stateComponent.short_name);
          }
        }
      }
    }

    // Fallback to OpenAI web search for location data
    if (city || zipCode) {
      const locationQuery = `${city || ''} ${zipCode || ''} location state`;
      const locationResult = await getLocationByWebSearch(locationQuery);

      if (locationResult && locationResult.state) {
        return getTerritoryByState(locationResult.state);
      }
    }

    // Fallback 1: ZIP code prefix mapping (more comprehensive)
    if (zipCode) {
      const zipPrefix = zipCode.substring(0, 2);
      const stateMap = {
        // Northeast
        '01': 'MA', '02': 'MA', '03': 'NH', '04': 'ME',
        '10': 'NY', '11': 'NY', '12': 'NY', '13': 'NY', '14': 'NY',
        '19': 'PA', '07': 'NJ', '08': 'NJ', '08': 'CT', '06': 'CT',
        '03': 'VT', '05': 'VT', '03': 'RI', '02': 'RI',

        // Southeast
        '20': 'MD', '21': 'MD', '21': 'DE', '19': 'DE',
        '20': 'VA', '22': 'VA', '23': 'VA', '24': 'VA',
        '28': 'NC', '27': 'NC', '28': 'SC', '29': 'SC',
        '30': 'GA', '31': 'GA', '32': 'GA', '33': 'GA', '34': 'GA',
        '35': 'AL', '36': 'AL', '37': 'AL', '35': 'FL', '32': 'FL', '33': 'FL', '34': 'FL',
        '37': 'TN', '38': 'TN', '37': 'KY', '40': 'KY', '41': 'KY',
        '39': 'WV', '25': 'WV', '26': 'WV',

        // Central/Midwest
        '43': 'OH', '44': 'OH', '45': 'OH', '44': 'MI', '48': 'MI', '49': 'MI',
        '46': 'IN', '47': 'IN', '46': 'IL', '60': 'IL', '61': 'IL', '62': 'IL',
        '50': 'WI', '53': 'WI', '54': 'WI', '50': 'MN', '55': 'MN', '56': 'MN',
        '63': 'MO', '64': 'MO', '65': 'MO', '66': 'KS', '67': 'KS',
        '68': 'NE', '69': 'NE', '68': 'IA', '50': 'IA', '51': 'IA', '52': 'IA',
        '73': 'OK', '74': 'OK', '73': 'AR', '71': 'AR', '72': 'AR',
        '75': 'TX', '76': 'TX', '77': 'TX', '78': 'TX', '79': 'TX',

        // Mountain West
        '59': 'MT', '59': 'WY', '82': 'WY', '83': 'WY', '80': 'CO', '81': 'CO',
        '83': 'UT', '84': 'UT', '83': 'ID', '83': 'NV', '89': 'NV',
        '86': 'NM', '87': 'NM', '88': 'NM', '87': 'AZ', '85': 'AZ',

        // Pacific
        '90': 'CA', '91': 'CA', '92': 'CA', '93': 'CA', '94': 'CA', '95': 'CA',
        '89': 'CA', '96': 'CA', '97': 'CA', '98': 'CA', '95': 'OR', '97': 'OR',
        '98': 'WA', '99': 'WA', '99': 'AK', '99': 'HI'
      };

      const state = stateMap[zipPrefix];
      if (state) {
        return getTerritoryByState(state);
      }
    }

    // Fallback 2: Major city mapping (expanded)
    const cityMap = {
      // Northwest
      'seattle': 'northwest', 'tacoma': 'northwest', 'spokane': 'northwest', 'bellevue': 'northwest',
      'portland': 'northwest', 'salem': 'northwest', 'eugene': 'northwest',
      'boise': 'northwest', 'helena': 'northwest', 'billings': 'northwest',

      // Southwest
      'san francisco': 'southwest', 'oakland': 'southwest', 'san jose': 'southwest',
      'los angeles': 'southwest', 'san diego': 'southwest', 'sacramento': 'southwest',
      'las vegas': 'southwest', 'reno': 'southwest', 'phoenix': 'southwest',
      'tucson': 'southwest', 'albuquerque': 'southwest', 'salt lake city': 'southwest',

      // Mountain
      'denver': 'mountain', 'colorado springs': 'mountain', 'aurora': 'mountain',
      'cheyenne': 'mountain', 'billings': 'mountain', 'boise': 'mountain',

      // Central
      'dallas': 'central', 'houston': 'central', 'austin': 'central', 'san antonio': 'central',
      'oklahoma city': 'central', 'tulsa': 'central', 'wichita': 'central',
      'omaha': 'central', 'des moines': 'central', 'minneapolis': 'central',
      'st louis': 'central', 'kansas city': 'central', 'little rock': 'central',

      // Southeast
      'atlanta': 'southeast', 'miami': 'southeast', 'orlando': 'southeast', 'tampa': 'southeast',
      'charlotte': 'southeast', 'raleigh': 'southeast', 'nashville': 'southeast',
      'memphis': 'southeast', 'birmingham': 'southeast', 'jackson': 'southeast',
      'new orleans': 'southeast', 'charleston': 'southeast', 'richmond': 'southeast',

      // Northeast
      'new york': 'northeast', 'brooklyn': 'northeast', 'queens': 'northeast',
      'boston': 'northeast', 'philadelphia': 'northeast', 'pittsburgh': 'northeast',
      'buffalo': 'northeast', 'rochester': 'northeast', 'syracuse': 'northeast',
      'hartford': 'northeast', 'providence': 'northeast', 'albany': 'northeast'
    };

    if (city && cityMap[city.toLowerCase()]) {
      return cityMap[city.toLowerCase()];
    }

    return null;
  } catch (error) {
    console.error('Location-based territory determination failed:', error);
    return null;
  }
}

async function getLocationByWebSearch(locationQuery) {
  try {
    const response = await fetch(`https://api.openai.com/v1/responses`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        instructions: 'You are a location research specialist with web search capabilities. Extract accurate geographic information including state codes, cities, and regions from location queries. Use web search to verify and find the most accurate location data.',
        input: `Extract the state code and location information from: "${locationQuery}".

Return a JSON object with:
{
  "state": "Two-letter state code (like CA, NY, TX)",
  "city": "City name if found",
  "confidence": "Confidence level 0-100",
  "region": "Geographic region if applicable"
}

Use web search to verify the location and ensure accuracy. Return only valid US state codes.`,
        tools: [
          {
            type: 'web_search'
          }
        ],
        text: {
          format: {
            type: "json_object"
          }
        },
        temperature: 0.1
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI Responses API location search failed: ${response.statusText}`);
    }

    const data = await response.json();

    // Handle Responses API format
    let locationData;
    if (data.output && data.output.length > 0) {
      const messageItem = data.output.find(item => item.type === 'message');
      if (messageItem && messageItem.content && messageItem.content.length > 0) {
        locationData = JSON.parse(messageItem.content[0].text);
      } else {
        throw new Error('No message content found in location response output');
      }
    } else if (data.output_text) {
      locationData = JSON.parse(data.output_text);
    } else {
      throw new Error('No location response content found');
    }

    // Validate state code
    const validStates = ['AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA', 'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD', 'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ', 'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC', 'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'];

    if (locationData.state && validStates.includes(locationData.state.toUpperCase())) {
      return {
        state: locationData.state.toUpperCase(),
        city: locationData.city || null,
        confidence: locationData.confidence || 80,
        region: locationData.region || null
      };
    }

    return null;
  } catch (error) {
    console.error('OpenAI Responses API location search failed:', error);
    return null;
  }
}

async function getSalesRepForTerritory(territoryName) {
  try {
    // Query sales reps assigned to this territory
    const { data, error } = await supabase
      .from('sales_reps')
      .select('id, name, email')
      .eq('territory', territoryName)
      .eq('is_active', true)
      .limit(1)
      .single();

    if (error || !data) {
      // Fallback to default rep for territory
      return getDefaultSalesRep(territoryName);
    }

    return {
      id: data.id,
      name: data.name,
      email: data.email
    };
  } catch (error) {
    console.error('Sales rep lookup failed:', error);
    return getDefaultSalesRep(territoryName);
  }
}

async function getDefaultSalesRep(territoryName) {
  try {
    // Try to get from database first
    const { data, error } = await supabase
      .from('sales_reps')
      .select('id, name, email')
      .eq('territory', territoryName)
      .eq('is_active', true)
      .eq('is_default', true)
      .limit(1)
      .single();

    if (error || !data) {
      // Fallback to configurable defaults from environment variables
      const territoryDefaults = {
        northwest: { id: 'rep_nw', name: 'Northwest Sales Rep', email: 'northwest@company.com' },
        southwest: { id: 'rep_sw', name: 'Southwest Sales Rep', email: 'southwest@company.com' },
        mountain: { id: 'rep_mt', name: 'Mountain Sales Rep', email: 'mountain@company.com' },
        central: { id: 'rep_ct', name: 'Central Sales Rep', email: 'central@company.com' },
        southeast: { id: 'rep_se', name: 'Southeast Sales Rep', email: 'southeast@company.com' },
        northeast: { id: 'rep_ne', name: 'Northeast Sales Rep', email: 'northeast@company.com' },
        international: { id: 'rep_intl', name: 'Global Sales Team', email: 'global@company.com' }
      };

      return territoryDefaults[territoryName] || territoryDefaults.international;
    }

    return {
      id: data.id,
      name: data.name,
      email: data.email
    };
  } catch (error) {
    console.error('Default sales rep lookup failed:', error);

    // Ultimate fallback
    return {
      id: `rep_${territoryName}`,
      name: `${territoryName.charAt(0).toUpperCase() + territoryName.slice(1)} Sales Rep`,
      email: `${territoryName}@company.com`
    };
  }
}

async function assignSalesRepresentative(contact, territory) {
  try {
    // Update contact with sales rep assignment
    const { error } = await supabase
      .from('contacts')
      .update({
        assignedSalesRep: territory.salesRep.id,
        salesRepName: territory.salesRep.name,
        salesRepEmail: territory.salesRep.email,
        assignmentDate: new Date().toISOString()
      })
      .eq('id', contact.id);

    if (error) throw error;

    // Create assignment notification
    await supabase
      .from('notifications')
      .insert({
        type: 'territory_assignment',
        priority: 'medium',
        title: `New Contact Assigned: ${contact.name}`,
        message: `${contact.name} from ${contact.company} has been assigned to your territory (${territory.name}).`,
        recipient_id: territory.salesRep.id,
        metadata: {
          contactId: contact.id,
          contactName: contact.name,
          territory: territory.name,
          assignmentType: 'automatic'
        },
        created_at: new Date().toISOString()
      });

    console.log(`Assigned contact ${contact.id} to sales rep ${territory.salesRep.name}`);
  } catch (error) {
    console.error('Sales rep assignment failed:', error);
    // Don't throw - territory assignment succeeded, rep assignment is secondary
  }
}