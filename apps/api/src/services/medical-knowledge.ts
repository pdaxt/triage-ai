/**
 * Medical Knowledge Base for TriageAI
 * Based on Australian Triage Scale (ATS) and ACEM Guidelines
 *
 * This provides structured clinical knowledge for RAG-style retrieval
 */

export interface ClinicalCondition {
  id: string;
  name: string;
  category: string;
  atsCategory: 1 | 2 | 3 | 4 | 5;
  maxWaitTime: string;
  keywords: string[];
  symptoms: string[];
  redFlags: string[];
  differentials: string[];
  questions: string[];
  criteria: string;
  action: string;
}

export interface TriageGuideline {
  atsCategory: 1 | 2 | 3 | 4 | 5;
  name: string;
  maxWaitTime: string;
  color: string;
  description: string;
  clinicalDescriptors: string[];
  examples: string[];
}

// Australian Triage Scale Categories
export const ATS_GUIDELINES: TriageGuideline[] = [
  {
    atsCategory: 1,
    name: 'Resuscitation',
    maxWaitTime: 'Immediate',
    color: '#DC2626', // Red
    description: 'Conditions that are threats to life or imminent risk of deterioration',
    clinicalDescriptors: [
      'Cardiac arrest',
      'Respiratory arrest',
      'Immediate risk to airway',
      'Respiratory rate <10 or >36',
      'Systolic BP <80',
      'GCS <9',
      'Major multi-trauma',
      'Severe burns >20% BSA'
    ],
    examples: [
      'Cardiac arrest',
      'Respiratory arrest/impending arrest',
      'Severe shock',
      'Major trauma',
      'Severe burns',
      'Drowning'
    ]
  },
  {
    atsCategory: 2,
    name: 'Emergency',
    maxWaitTime: '10 minutes',
    color: '#EA580C', // Orange
    description: 'Conditions that are imminently life-threatening or important time-critical treatment',
    clinicalDescriptors: [
      'Risk of airway compromise',
      'Severe respiratory distress',
      'Circulatory compromise',
      'Severe pain',
      'Acute mental health crisis',
      'Febrile child <3 months',
      'Acute hemiparesis or dysphasia',
      'Chest pain likely cardiac'
    ],
    examples: [
      'Chest pain - likely cardiac',
      'Stroke symptoms (FAST positive)',
      'Severe asthma attack',
      'Anaphylaxis',
      'Severe allergic reaction',
      'Active GI bleed',
      'Suicidal ideation with plan',
      'Severe headache sudden onset'
    ]
  },
  {
    atsCategory: 3,
    name: 'Urgent',
    maxWaitTime: '30 minutes',
    color: '#CA8A04', // Yellow
    description: 'Conditions that could potentially be life-threatening or progress to emergency',
    clinicalDescriptors: [
      'Moderate shortness of breath',
      'Severe pain (7-10/10)',
      'Moderate blood loss',
      'Vomiting and moderate dehydration',
      'High fever with systemic symptoms',
      'Acute psychosis',
      'Significant head injury'
    ],
    examples: [
      'High fever (>38.5°C) with systemic symptoms',
      'Moderate asthma',
      'Moderate dehydration',
      'Significant abdominal pain',
      'Chest pain - non cardiac',
      'Head injury with vomiting',
      'Fractures with deformity'
    ]
  },
  {
    atsCategory: 4,
    name: 'Semi-urgent',
    maxWaitTime: '60 minutes',
    color: '#16A34A', // Green
    description: 'Conditions that are potentially serious but can safely wait',
    clinicalDescriptors: [
      'Mild shortness of breath',
      'Mild to moderate pain (4-6/10)',
      'Minor head injury',
      'Mild fever',
      'Vomiting without dehydration',
      'Foreign body without obstruction',
      'Non-displaced fractures'
    ],
    examples: [
      'Minor head injury (no LOC)',
      'Sprains and strains',
      'Uncomplicated UTI',
      'Ear pain',
      'Minor allergic reaction',
      'Mild asthma',
      'Gastroenteritis (not dehydrated)'
    ]
  },
  {
    atsCategory: 5,
    name: 'Non-urgent',
    maxWaitTime: '120 minutes',
    color: '#2563EB', // Blue
    description: 'Conditions that are not urgent and can wait or be referred',
    clinicalDescriptors: [
      'Chronic stable conditions',
      'Minor symptoms',
      'Mild pain (1-3/10)',
      'Administrative requests',
      'Medication refills',
      'Minor wounds',
      'Results review'
    ],
    examples: [
      'Minor wound - no stitches needed',
      'Chronic pain - stable',
      'Minor rash',
      'Mild cold symptoms',
      'Prescription refill',
      'Referral requests',
      'Minor insect bites'
    ]
  }
];

// Clinical Conditions Database
export const CLINICAL_CONDITIONS: ClinicalCondition[] = [
  // ATS 1 - Resuscitation
  {
    id: 'cardiac_arrest',
    name: 'Cardiac Arrest',
    category: 'Cardiovascular',
    atsCategory: 1,
    maxWaitTime: 'Immediate',
    keywords: ['no pulse', 'not breathing', 'collapsed', 'unresponsive'],
    symptoms: ['Unresponsive', 'Not breathing', 'No pulse'],
    redFlags: ['No pulse', 'Not breathing', 'Unresponsive'],
    differentials: ['VF/VT', 'Asystole', 'PEA'],
    questions: ['When did they collapse?', 'Has CPR been started?'],
    criteria: 'Absent pulse and respiration',
    action: 'CALL 000 IMMEDIATELY. Start CPR if trained.'
  },

  // ATS 2 - Emergency
  {
    id: 'chest_pain_cardiac',
    name: 'Chest Pain (Cardiac)',
    category: 'Cardiovascular',
    atsCategory: 2,
    maxWaitTime: '10 minutes',
    keywords: ['chest pain', 'chest tightness', 'crushing', 'radiating arm', 'jaw pain', 'sweating'],
    symptoms: [
      'Central chest pain or pressure',
      'Radiation to arm, jaw, or back',
      'Associated sweating',
      'Nausea',
      'Shortness of breath',
      'Pallor'
    ],
    redFlags: [
      'Pain >20 minutes',
      'Known cardiac history',
      'Associated diaphoresis',
      'Hypotension',
      'Cardiac risk factors'
    ],
    differentials: ['Acute Coronary Syndrome', 'Unstable Angina', 'STEMI', 'NSTEMI', 'Aortic Dissection'],
    questions: [
      'When did the pain start?',
      'Does it radiate anywhere?',
      'Any sweating or nausea?',
      'Any cardiac history?',
      'Taking blood thinners?'
    ],
    criteria: 'Chest pain with cardiac features: crushing, radiating, diaphoresis, or risk factors',
    action: 'URGENT: Call 000. Aspirin if available and not allergic. Do not drive yourself.'
  },
  {
    id: 'stroke',
    name: 'Stroke (CVA)',
    category: 'Neurological',
    atsCategory: 2,
    maxWaitTime: '10 minutes',
    keywords: ['face drooping', 'arm weakness', 'slurred speech', 'one side weak', 'sudden confusion'],
    symptoms: [
      'Facial droop on one side',
      'Arm or leg weakness',
      'Slurred speech',
      'Sudden confusion',
      'Vision changes',
      'Severe sudden headache'
    ],
    redFlags: [
      'FAST positive (Face, Arm, Speech, Time)',
      'Sudden onset',
      'Multiple symptoms',
      'Altered consciousness'
    ],
    differentials: ['Ischaemic stroke', 'Haemorrhagic stroke', 'TIA', 'Hypoglycaemia', 'Seizure'],
    questions: [
      'When exactly did symptoms start?',
      'Can you smile - is it even?',
      'Can you raise both arms?',
      'Is speech normal?'
    ],
    criteria: 'FAST positive: Face droop, Arm weakness, Speech difficulty - Time critical',
    action: 'EMERGENCY: Call 000 immediately. Time is brain. Note exact time of onset.'
  },
  {
    id: 'severe_respiratory',
    name: 'Severe Respiratory Distress',
    category: 'Respiratory',
    atsCategory: 2,
    maxWaitTime: '10 minutes',
    keywords: ['cant breathe', 'gasping', 'choking', 'severe asthma', 'blue lips'],
    symptoms: [
      'Severe shortness of breath',
      'Cannot complete sentences',
      'Using accessory muscles',
      'Cyanosis (blue lips/fingers)',
      'Exhaustion from breathing'
    ],
    redFlags: [
      'Cannot speak in sentences',
      'Cyanosis',
      'Exhaustion',
      'Silent chest in asthma',
      'SpO2 <90%'
    ],
    differentials: ['Severe asthma', 'COPD exacerbation', 'Pulmonary embolism', 'Anaphylaxis', 'Pneumothorax'],
    questions: [
      'Can you speak in full sentences?',
      'Do you have asthma or COPD?',
      'Any allergies that caused this?',
      'Any chest pain?'
    ],
    criteria: 'Severe dyspnoea with distress signs: accessory muscles, cannot speak sentences, cyanosis',
    action: 'EMERGENCY: Call 000. Sit upright. Use reliever if available.'
  },
  {
    id: 'anaphylaxis',
    name: 'Anaphylaxis',
    category: 'Allergy/Immunology',
    atsCategory: 2,
    maxWaitTime: '10 minutes',
    keywords: ['throat swelling', 'throat closing', 'severe allergic', 'epipen', 'hives breathing'],
    symptoms: [
      'Throat tightness or swelling',
      'Difficulty breathing',
      'Widespread hives',
      'Swelling of face/lips',
      'Dizziness or fainting',
      'Abdominal pain'
    ],
    redFlags: [
      'Airway compromise',
      'Hypotension',
      'Previous anaphylaxis',
      'Rapid progression',
      'Multiple systems involved'
    ],
    differentials: ['Anaphylaxis', 'Severe allergic reaction', 'Angioedema', 'Asthma attack'],
    questions: [
      'What triggered this?',
      'Do you have an EpiPen?',
      'Previous anaphylaxis?',
      'Any difficulty swallowing?'
    ],
    criteria: 'Allergic reaction with airway/breathing compromise or hypotension',
    action: 'EMERGENCY: Call 000. Use EpiPen if available. Lie flat unless breathing difficulty.'
  },
  {
    id: 'suicidal_crisis',
    name: 'Suicidal Crisis',
    category: 'Mental Health',
    atsCategory: 2,
    maxWaitTime: '10 minutes',
    keywords: ['kill myself', 'suicide', 'want to die', 'end my life', 'self harm', 'better off dead'],
    symptoms: [
      'Expressing suicidal thoughts',
      'Active suicidal plan',
      'Access to means',
      'Severe distress',
      'Hopelessness'
    ],
    redFlags: [
      'Active plan',
      'Access to means',
      'Previous attempts',
      'Recent significant loss',
      'Intoxication'
    ],
    differentials: ['Suicidal crisis', 'Psychotic episode', 'Severe depression', 'Intoxication'],
    questions: [
      'Are you safe right now?',
      'Do you have a plan?',
      'Is anyone with you?',
      'Have you harmed yourself?'
    ],
    criteria: 'Active suicidal ideation, especially with plan or means',
    action: 'URGENT: Stay with person. Call 000 or Lifeline 13 11 14. Remove access to means.'
  },
  {
    id: 'thunderclap_headache',
    name: 'Thunderclap Headache',
    category: 'Neurological',
    atsCategory: 2,
    maxWaitTime: '10 minutes',
    keywords: ['worst headache', 'thunderclap', 'sudden severe headache', 'worst headache ever'],
    symptoms: [
      'Sudden onset severe headache',
      'Reaches maximum intensity in <60 seconds',
      'Often described as "worst headache of my life"',
      'May have neck stiffness',
      'Nausea/vomiting'
    ],
    redFlags: [
      'Sudden onset',
      '"Worst ever" description',
      'Neck stiffness',
      'Altered consciousness',
      'Fever'
    ],
    differentials: ['Subarachnoid haemorrhage', 'Intracerebral haemorrhage', 'Meningitis', 'Hypertensive crisis'],
    questions: [
      'How fast did it come on?',
      'Is this the worst headache of your life?',
      'Any neck stiffness?',
      'Any recent head trauma?'
    ],
    criteria: 'Sudden severe headache reaching maximum intensity within 60 seconds',
    action: 'EMERGENCY: Call 000. Do not take aspirin. Keep still and quiet.'
  },

  // ATS 3 - Urgent
  {
    id: 'high_fever',
    name: 'High Fever with Systemic Symptoms',
    category: 'Infectious',
    atsCategory: 3,
    maxWaitTime: '30 minutes',
    keywords: ['high fever', 'fever chills', 'fever vomiting', 'fever rash', 'very unwell'],
    symptoms: [
      'Temperature >38.5°C',
      'Chills/rigors',
      'Associated symptoms (cough, urinary, etc)',
      'Generally unwell',
      'Reduced oral intake'
    ],
    redFlags: [
      'Age <3 months or elderly',
      'Immunocompromised',
      'Recent overseas travel',
      'Petechial rash',
      'Severe localizing symptoms'
    ],
    differentials: ['Viral infection', 'Bacterial infection', 'UTI', 'Pneumonia', 'Meningitis'],
    questions: [
      'How high is the temperature?',
      'Any rash?',
      'Any neck stiffness?',
      'Recent travel?',
      'Immunocompromised?'
    ],
    criteria: 'Fever >38.5°C with systemic symptoms or risk factors',
    action: 'URGENT: Seek medical assessment within 30 minutes. Stay hydrated.'
  },
  {
    id: 'severe_pain',
    name: 'Severe Pain',
    category: 'General',
    atsCategory: 3,
    maxWaitTime: '30 minutes',
    keywords: ['severe pain', 'worst pain', 'unbearable pain', '10 out of 10'],
    symptoms: [
      'Pain 7-10/10',
      'Distress visible',
      'Unable to get comfortable',
      'Affecting function'
    ],
    redFlags: [
      'Sudden onset',
      'Associated neurological symptoms',
      'Fever with pain',
      'Trauma history'
    ],
    differentials: ['Varies by location - investigate source'],
    questions: [
      'Where exactly is the pain?',
      'When did it start?',
      'What makes it better or worse?',
      'Any numbness or weakness?'
    ],
    criteria: 'Pain rated 7-10/10 with visible distress',
    action: 'URGENT: Medical assessment needed within 30 minutes.'
  },
  {
    id: 'abdominal_pain_significant',
    name: 'Significant Abdominal Pain',
    category: 'Gastrointestinal',
    atsCategory: 3,
    maxWaitTime: '30 minutes',
    keywords: ['bad stomach pain', 'severe abdominal', 'belly pain severe'],
    symptoms: [
      'Moderate to severe abdominal pain',
      'Nausea/vomiting',
      'Change in bowel habits',
      'Tenderness on palpation'
    ],
    redFlags: [
      'Rigid abdomen',
      'Rebound tenderness',
      'Bloody stool/vomit',
      'Fever with pain',
      'Recent surgery'
    ],
    differentials: ['Appendicitis', 'Cholecystitis', 'Pancreatitis', 'Bowel obstruction', 'Ectopic pregnancy'],
    questions: [
      'Where is the pain worst?',
      'Any vomiting or diarrhoea?',
      'Any blood in stool or vomit?',
      'For females: could you be pregnant?',
      'When did you last pass wind?'
    ],
    criteria: 'Abdominal pain with concerning features or moderate severity',
    action: 'URGENT: Seek medical assessment. Do not eat or drink until assessed.'
  },

  // ATS 4 - Semi-urgent
  {
    id: 'mild_headache',
    name: 'Mild to Moderate Headache',
    category: 'Neurological',
    atsCategory: 4,
    maxWaitTime: '60 minutes',
    keywords: ['headache', 'mild headache', 'tension headache', 'stress headache'],
    symptoms: [
      'Mild to moderate head pain',
      'No sudden onset',
      'No neurological symptoms',
      'Able to function'
    ],
    redFlags: [],
    differentials: ['Tension headache', 'Migraine', 'Dehydration', 'Eyestrain', 'Sinusitis'],
    questions: [
      'How long have you had it?',
      'Have you had headaches like this before?',
      'Any vision changes?',
      'Have you tried any treatment?'
    ],
    criteria: 'Non-severe headache without red flags',
    action: 'SEMI-URGENT: Try paracetamol, hydration, rest. See GP if persists.'
  },
  {
    id: 'minor_injury',
    name: 'Minor Injury',
    category: 'Trauma',
    atsCategory: 4,
    maxWaitTime: '60 minutes',
    keywords: ['twisted ankle', 'sprain', 'minor cut', 'fell', 'bruise'],
    symptoms: [
      'Localized pain',
      'Swelling',
      'Limited movement',
      'No deformity'
    ],
    redFlags: [],
    differentials: ['Sprain', 'Strain', 'Contusion', 'Minor fracture'],
    questions: [
      'How did it happen?',
      'Can you weight bear?',
      'Any numbness or tingling?',
      'Any obvious deformity?'
    ],
    criteria: 'Minor injury with no deformity, neurovascular intact',
    action: 'SEMI-URGENT: RICE (Rest, Ice, Compression, Elevation). See GP or ED within 24 hours.'
  },
  {
    id: 'uti_symptoms',
    name: 'Urinary Tract Infection Symptoms',
    category: 'Urological',
    atsCategory: 4,
    maxWaitTime: '60 minutes',
    keywords: ['burning pee', 'frequent urination', 'uti', 'bladder infection'],
    symptoms: [
      'Dysuria (painful urination)',
      'Frequency',
      'Urgency',
      'Suprapubic discomfort'
    ],
    redFlags: [
      'Fever',
      'Back pain',
      'Vomiting',
      'Pregnant',
      'Male patient'
    ],
    differentials: ['Cystitis', 'Urethritis', 'STI', 'Kidney infection'],
    questions: [
      'Any fever?',
      'Any back pain?',
      'Any blood in urine?',
      'Pregnant or possibility of pregnancy?'
    ],
    criteria: 'Urinary symptoms without systemic features',
    action: 'SEMI-URGENT: Increase fluids. See GP within 24 hours for antibiotics if needed.'
  },

  // ATS 5 - Non-urgent
  {
    id: 'common_cold',
    name: 'Common Cold / Mild URTI',
    category: 'Respiratory',
    atsCategory: 5,
    maxWaitTime: '120 minutes',
    keywords: ['cold', 'runny nose', 'sore throat', 'mild cough', 'sniffles'],
    symptoms: [
      'Runny nose',
      'Mild sore throat',
      'Mild cough',
      'Low grade fever',
      'Generally well'
    ],
    redFlags: [],
    differentials: ['Viral URTI', 'Rhinitis', 'Early influenza'],
    questions: [
      'How long have you had symptoms?',
      'Any high fever?',
      'Any difficulty breathing?',
      'Any underlying conditions?'
    ],
    criteria: 'Mild upper respiratory symptoms, no red flags',
    action: 'NON-URGENT: Rest, fluids, paracetamol for comfort. See GP if worsens.'
  },
  {
    id: 'minor_rash',
    name: 'Minor Rash',
    category: 'Dermatology',
    atsCategory: 5,
    maxWaitTime: '120 minutes',
    keywords: ['rash', 'itchy skin', 'skin irritation', 'minor rash'],
    symptoms: [
      'Localized or mild rash',
      'Itching',
      'No systemic symptoms',
      'No mucosal involvement'
    ],
    redFlags: [],
    differentials: ['Contact dermatitis', 'Eczema', 'Allergic reaction', 'Viral exanthem'],
    questions: [
      'When did it start?',
      'Any new products/foods?',
      'Is it spreading?',
      'Any difficulty breathing?'
    ],
    criteria: 'Non-progressive rash without systemic symptoms',
    action: 'NON-URGENT: Antihistamines for itch. See GP if spreads or persists.'
  },
  {
    id: 'chronic_stable',
    name: 'Chronic Stable Condition',
    category: 'General',
    atsCategory: 5,
    maxWaitTime: '120 minutes',
    keywords: ['usual pain', 'chronic problem', 'ongoing issue', 'same as usual'],
    symptoms: [
      'Symptoms at baseline',
      'No acute changes',
      'Functioning normally',
      'Seeking routine care'
    ],
    redFlags: [],
    differentials: ['Chronic condition at baseline'],
    questions: [
      'Is this different from usual?',
      'What usually helps?',
      'Have you seen your GP recently?'
    ],
    criteria: 'Chronic condition without acute deterioration',
    action: 'NON-URGENT: Continue usual management. Schedule GP appointment.'
  }
];

/**
 * Retrieve relevant clinical conditions based on symptoms
 */
export function retrieveRelevantConditions(symptoms: string): ClinicalCondition[] {
  const lowerSymptoms = symptoms.toLowerCase();
  const relevantConditions: Array<{ condition: ClinicalCondition; score: number }> = [];

  for (const condition of CLINICAL_CONDITIONS) {
    let score = 0;

    // Check keyword matches
    for (const keyword of condition.keywords) {
      if (lowerSymptoms.includes(keyword.toLowerCase())) {
        score += 3;
      }
    }

    // Check symptom matches
    for (const symptom of condition.symptoms) {
      if (lowerSymptoms.includes(symptom.toLowerCase())) {
        score += 2;
      }
    }

    // Check red flag matches (highest weight)
    for (const redFlag of condition.redFlags) {
      if (lowerSymptoms.includes(redFlag.toLowerCase())) {
        score += 5;
      }
    }

    if (score > 0) {
      relevantConditions.push({ condition, score });
    }
  }

  // Sort by score descending and return top matches
  return relevantConditions
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map(rc => rc.condition);
}

/**
 * Get ATS category from urgency level
 */
export function getATSCategory(urgency: string): TriageGuideline | undefined {
  const mapping: Record<string, number> = {
    'EMERGENCY': 2,
    'URGENT': 3,
    'SEMI_URGENT': 4,
    'STANDARD': 4,
    'NON_URGENT': 5
  };

  const category = mapping[urgency];
  return ATS_GUIDELINES.find(g => g.atsCategory === category);
}

/**
 * Build clinical context for LLM prompt
 */
export function buildClinicalContext(symptoms: string): string {
  const conditions = retrieveRelevantConditions(symptoms);

  if (conditions.length === 0) {
    return 'No specific clinical conditions matched. Use general assessment principles.';
  }

  const context = conditions.map(c => `
### ${c.name} (ATS ${c.atsCategory} - ${c.maxWaitTime})
**Category:** ${c.category}
**Key Symptoms:** ${c.symptoms.join(', ')}
**Red Flags:** ${c.redFlags.length > 0 ? c.redFlags.join(', ') : 'None specific'}
**Questions to Ask:** ${c.questions.join('; ')}
**Criteria:** ${c.criteria}
**Action:** ${c.action}
`).join('\n---\n');

  return `# RELEVANT CLINICAL CONDITIONS\n\n${context}`;
}

/**
 * Determine minimum ATS category based on keywords
 * Only escalates for STRONG matches - weak matches default to ATS 5
 */
export function getMinimumATSFromSymptoms(symptoms: string): number {
  // The deterministic keyword detection in conversation-engine.ts
  // handles red flags. This function should NOT over-escalate based
  // on weak RAG matches.
  //
  // For non-emergency presentations that passed through keyword detection,
  // let the LLM decide the appropriate ATS with full context.
  return 5;
}
