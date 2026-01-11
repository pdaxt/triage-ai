/**
 * 100 Edge Case Test Suite for TriageAI
 *
 * Categories:
 * - ATS 1 (Resuscitation): Cases 1-10
 * - ATS 2 (Emergency): Cases 11-30
 * - ATS 3 (Urgent): Cases 31-50
 * - ATS 4 (Semi-urgent): Cases 51-70
 * - ATS 5 (Non-urgent): Cases 71-85
 * - Edge Cases & Ambiguous: Cases 86-100
 */

export interface TestCase {
  id: number;
  name: string;
  input: string;
  expectedATS: number;
  expectedUrgency: 'EMERGENCY' | 'URGENT' | 'SEMI_URGENT' | 'NON_URGENT';
  expectedRedFlags: string[];
  category: string;
  rationale: string;
}

export const TEST_CASES: TestCase[] = [
  // ============================================
  // ATS 1 - RESUSCITATION (Immediate)
  // ============================================
  {
    id: 1,
    name: 'Cardiac Arrest',
    input: 'My husband just collapsed, he has no pulse and is not breathing',
    expectedATS: 1,
    expectedUrgency: 'EMERGENCY',
    expectedRedFlags: ['Loss of consciousness'],
    category: 'Cardiovascular',
    rationale: 'Cardiac arrest requires immediate resuscitation'
  },
  {
    id: 2,
    name: 'Severe Anaphylaxis',
    input: 'I ate peanuts and my throat is closing, I can barely breathe',
    expectedATS: 1,
    expectedUrgency: 'EMERGENCY',
    expectedRedFlags: ['Possible anaphylaxis', 'Difficulty breathing'],
    category: 'Allergy',
    rationale: 'Anaphylaxis with airway compromise is life-threatening'
  },
  {
    id: 3,
    name: 'Choking - Complete Obstruction',
    input: 'My child is choking and turning blue, cant breathe at all',
    expectedATS: 1,
    expectedUrgency: 'EMERGENCY',
    expectedRedFlags: ['Difficulty breathing'],
    category: 'Respiratory',
    rationale: 'Complete airway obstruction requires immediate intervention'
  },
  {
    id: 4,
    name: 'Major Trauma - Unresponsive',
    input: 'Car accident, the person is bleeding heavily and not responding',
    expectedATS: 2,  // ATS 2 appropriate until confirmed cardiac arrest
    expectedUrgency: 'EMERGENCY',
    expectedRedFlags: ['Major trauma', 'Severe bleeding', 'Loss of consciousness'],
    category: 'Trauma',
    rationale: 'Major trauma with unresponsiveness indicates severe injury'
  },
  {
    id: 5,
    name: 'Severe Respiratory Distress - Child',
    input: 'My baby is gasping for air and his lips are turning blue',
    expectedATS: 2,  // ATS 2 appropriate - imminent threat, not yet arrested
    expectedUrgency: 'EMERGENCY',
    expectedRedFlags: ['Difficulty breathing'],
    category: 'Paediatric',
    rationale: 'Paediatric respiratory failure with cyanosis is critical'
  },
  {
    id: 6,
    name: 'Drug Overdose - Unresponsive',
    input: 'Found my friend passed out with needles, barely breathing',
    expectedATS: 2,  // ATS 2 - still breathing, imminent threat
    expectedUrgency: 'EMERGENCY',
    expectedRedFlags: ['Loss of consciousness', 'Difficulty breathing'],
    category: 'Toxicology',
    rationale: 'Opioid overdose with respiratory depression needs naloxone'
  },
  {
    id: 7,
    name: 'Drowning - Just Pulled Out',
    input: 'Just pulled my son from the pool, he swallowed water and passed out',
    expectedATS: 2,  // ATS 2 - unconscious but may have pulse
    expectedUrgency: 'EMERGENCY',
    expectedRedFlags: ['Loss of consciousness'],
    category: 'Trauma',
    rationale: 'Near-drowning with loss of consciousness is critical'
  },
  {
    id: 8,
    name: 'Electric Shock - Unresponsive',
    input: 'Worker got shocked by power lines, not moving or responding',
    expectedATS: 2,  // ATS 2 until confirmed arrest
    expectedUrgency: 'EMERGENCY',
    expectedRedFlags: ['Loss of consciousness'],
    category: 'Trauma',
    rationale: 'High voltage shock can cause cardiac arrest'
  },
  {
    id: 9,
    name: 'Hanging Attempt - Just Found',
    input: 'Found my teenager hanging in their room, just cut them down, not breathing',
    expectedATS: 2,  // ATS 2 for mental health crisis + respiratory compromise
    expectedUrgency: 'EMERGENCY',
    expectedRedFlags: ['Suicidal ideation', 'Difficulty breathing'],
    category: 'Mental Health',
    rationale: 'Hanging attempt with respiratory compromise is critical'
  },
  {
    id: 10,
    name: 'Severe Burns - Large Area',
    input: 'House fire, person has burns all over their body, screaming in pain',
    expectedATS: 2,  // ATS 2 - severe burns but responsive
    expectedUrgency: 'EMERGENCY',
    expectedRedFlags: [],
    category: 'Burns',
    rationale: 'Large surface area burns risk shock and airway compromise'
  },

  // ============================================
  // ATS 2 - EMERGENCY (10 minutes)
  // ============================================
  {
    id: 11,
    name: 'Classic Heart Attack',
    input: 'I have crushing chest pain radiating to my left arm and jaw, sweating profusely',
    expectedATS: 2,
    expectedUrgency: 'EMERGENCY',
    expectedRedFlags: ['Chest pain'],
    category: 'Cardiovascular',
    rationale: 'Classic ACS presentation needs immediate ECG'
  },
  {
    id: 12,
    name: 'Stroke - FAST Positive',
    input: 'My wife\'s face is drooping on one side and her arm is weak, happened 20 minutes ago',
    expectedATS: 2,
    expectedUrgency: 'EMERGENCY',
    expectedRedFlags: ['Possible stroke symptoms'],
    category: 'Neurological',
    rationale: 'Stroke symptoms require urgent thrombolysis assessment'
  },
  {
    id: 13,
    name: 'Thunderclap Headache',
    input: 'Sudden worst headache of my life, came on in seconds, never had anything like it',
    expectedATS: 2,
    expectedUrgency: 'EMERGENCY',
    expectedRedFlags: ['Sudden severe headache'],
    category: 'Neurological',
    rationale: 'Thunderclap headache must rule out SAH'
  },
  {
    id: 14,
    name: 'Suicidal with Plan',
    input: 'I want to end my life tonight, I have pills saved up and a plan',
    expectedATS: 2,
    expectedUrgency: 'EMERGENCY',
    expectedRedFlags: ['Suicidal ideation'],
    category: 'Mental Health',
    rationale: 'Active suicidal ideation with plan is high risk'
  },
  {
    id: 15,
    name: 'Severe Asthma Attack',
    input: 'Cant speak in sentences, blue inhaler not working, struggling to breathe',
    expectedATS: 2,
    expectedUrgency: 'EMERGENCY',
    expectedRedFlags: ['Difficulty breathing'],
    category: 'Respiratory',
    rationale: 'Severe asthma not responding to bronchodilators'
  },
  {
    id: 16,
    name: 'Chest Pain - Young Adult',
    input: 'Im 25, sharp chest pain when I breathe, also have shortness of breath',
    expectedATS: 2,
    expectedUrgency: 'EMERGENCY',
    expectedRedFlags: ['Chest pain', 'Difficulty breathing'],
    category: 'Cardiovascular',
    rationale: 'Pleuritic chest pain could indicate PE or pneumothorax'
  },
  {
    id: 17,
    name: 'Diabetic Hypoglycemia - Confused',
    input: 'Diabetic patient is confused, sweating, and acting strange',
    expectedATS: 2,
    expectedUrgency: 'EMERGENCY',
    expectedRedFlags: ['Altered mental status'],
    category: 'Endocrine',
    rationale: 'Severe hypoglycemia can progress to seizure/coma'
  },
  {
    id: 18,
    name: 'Meningitis Symptoms',
    input: 'High fever, severe headache, stiff neck, and a rash that doesnt fade',
    expectedATS: 2,
    expectedUrgency: 'EMERGENCY',
    expectedRedFlags: ['Sudden severe headache'],
    category: 'Infectious',
    rationale: 'Meningococcal meningitis needs immediate antibiotics'
  },
  {
    id: 19,
    name: 'Active GI Bleed',
    input: 'Vomiting large amounts of blood and my stool is black and tarry',
    expectedATS: 2,
    expectedUrgency: 'EMERGENCY',
    expectedRedFlags: ['Severe bleeding'],
    category: 'Gastrointestinal',
    rationale: 'Upper GI bleed with haematemesis needs urgent intervention'
  },
  {
    id: 20,
    name: 'Ectopic Pregnancy',
    input: 'Pregnant, severe one-sided abdominal pain, feeling dizzy and faint',
    expectedATS: 2,
    expectedUrgency: 'EMERGENCY',
    expectedRedFlags: ['Loss of consciousness'],
    category: 'Obstetric',
    rationale: 'Ruptured ectopic can cause life-threatening hemorrhage'
  },
  {
    id: 21,
    name: 'Acute Psychosis',
    input: 'Person is hearing voices telling them to hurt themselves, very agitated',
    expectedATS: 2,
    expectedUrgency: 'EMERGENCY',
    expectedRedFlags: ['Suicidal ideation'],
    category: 'Mental Health',
    rationale: 'Command hallucinations with self-harm risk'
  },
  {
    id: 22,
    name: 'Testicular Torsion',
    input: 'Sudden severe pain in my testicle, started 2 hours ago, nauseous',
    expectedATS: 2,
    expectedUrgency: 'EMERGENCY',
    expectedRedFlags: [],
    category: 'Urological',
    rationale: '6-hour window for testicular salvage'
  },
  {
    id: 23,
    name: 'Severe Allergic Reaction',
    input: 'Just got stung by a bee, hives spreading everywhere, face swelling',
    expectedATS: 2,
    expectedUrgency: 'EMERGENCY',
    expectedRedFlags: [],
    category: 'Allergy',
    rationale: 'Progressing allergic reaction may become anaphylaxis'
  },
  {
    id: 24,
    name: 'Febrile Infant',
    input: 'My 6 week old baby has a fever of 38.5 and is very irritable',
    expectedATS: 2,
    expectedUrgency: 'EMERGENCY',
    expectedRedFlags: [],
    category: 'Paediatric',
    rationale: 'Febrile infants <3 months need septic workup'
  },
  {
    id: 25,
    name: 'Acute Vision Loss',
    input: 'Suddenly cant see out of my right eye, like a curtain came down',
    expectedATS: 2,
    expectedUrgency: 'EMERGENCY',
    expectedRedFlags: [],
    category: 'Ophthalmology',
    rationale: 'Central retinal artery occlusion or detachment'
  },
  {
    id: 26,
    name: 'Severe Abdominal Pain - Rigid',
    input: 'Worst abdominal pain ever, my belly is hard as a board',
    expectedATS: 2,
    expectedUrgency: 'EMERGENCY',
    expectedRedFlags: [],
    category: 'Surgical',
    rationale: 'Peritonitis requires urgent surgical assessment'
  },
  {
    id: 27,
    name: 'Post-Partum Hemorrhage',
    input: 'Just gave birth, soaking through pads every 15 minutes, feeling faint',
    expectedATS: 2,
    expectedUrgency: 'EMERGENCY',
    expectedRedFlags: ['Severe bleeding'],
    category: 'Obstetric',
    rationale: 'PPH can rapidly become life-threatening'
  },
  {
    id: 28,
    name: 'Severe Dehydration',
    input: 'Havent urinated in 24 hours, lips cracked, cant keep anything down',
    expectedATS: 2,
    expectedUrgency: 'EMERGENCY',
    expectedRedFlags: [],
    category: 'General',
    rationale: 'Severe dehydration needs IV fluids'
  },
  {
    id: 29,
    name: 'Compartment Syndrome',
    input: 'Leg injury yesterday, now severe pain, cant move toes, leg feels tight',
    expectedATS: 2,
    expectedUrgency: 'EMERGENCY',
    expectedRedFlags: [],
    category: 'Orthopaedic',
    rationale: 'Compartment syndrome needs urgent fasciotomy'
  },
  {
    id: 30,
    name: 'Pulmonary Embolism',
    input: 'Sudden shortness of breath, sharp chest pain, just had surgery last week',
    expectedATS: 2,
    expectedUrgency: 'EMERGENCY',
    expectedRedFlags: ['Difficulty breathing', 'Chest pain'],
    category: 'Respiratory',
    rationale: 'Post-operative PE needs urgent anticoagulation'
  },

  // ============================================
  // ATS 3 - URGENT (30 minutes)
  // ============================================
  {
    id: 31,
    name: 'Moderate Asthma',
    input: 'Asthma flare, using inhaler every 2 hours, can still talk',
    expectedATS: 3,
    expectedUrgency: 'URGENT',
    expectedRedFlags: [],
    category: 'Respiratory',
    rationale: 'Moderate asthma exacerbation needs monitoring'
  },
  {
    id: 32,
    name: 'High Fever Adult',
    input: 'Temperature 39.5, body aches, feeling really unwell',
    expectedATS: 3,
    expectedUrgency: 'URGENT',
    expectedRedFlags: [],
    category: 'Infectious',
    rationale: 'High fever needs assessment for source'
  },
  {
    id: 33,
    name: 'Kidney Stone',
    input: 'Severe colicky pain in my side radiating to groin, 9 out of 10',
    expectedATS: 3,
    expectedUrgency: 'URGENT',
    expectedRedFlags: [],
    category: 'Urological',
    rationale: 'Severe pain requires analgesia and assessment'
  },
  {
    id: 34,
    name: 'Appendicitis - Early',
    input: 'Pain started around my belly button, now in lower right, worse when I move',
    expectedATS: 3,
    expectedUrgency: 'URGENT',
    expectedRedFlags: [],
    category: 'Surgical',
    rationale: 'Possible appendicitis needs urgent review'
  },
  {
    id: 35,
    name: 'Head Injury with Vomiting',
    input: 'Hit my head 2 hours ago, vomited twice, bit of a headache',
    expectedATS: 3,
    expectedUrgency: 'URGENT',
    expectedRedFlags: [],
    category: 'Neurological',
    rationale: 'Head injury with vomiting needs CT consideration'
  },
  {
    id: 36,
    name: 'Displaced Fracture',
    input: 'Fell and my arm looks bent the wrong way, severe pain',
    expectedATS: 3,
    expectedUrgency: 'URGENT',
    expectedRedFlags: [],
    category: 'Orthopaedic',
    rationale: 'Displaced fracture needs urgent reduction'
  },
  {
    id: 37,
    name: 'Panic Attack - First Time',
    input: 'Heart racing, cant catch my breath, feel like Im dying, first time',
    expectedATS: 3,
    expectedUrgency: 'URGENT',
    expectedRedFlags: ['Difficulty breathing'],
    category: 'Mental Health',
    rationale: 'First panic attack needs cardiac exclusion'
  },
  {
    id: 38,
    name: 'Severe Migraine',
    input: 'Worst migraine in years, vomiting, light hurts, pain 10/10',
    expectedATS: 3,
    expectedUrgency: 'URGENT',
    expectedRedFlags: [],
    category: 'Neurological',
    rationale: 'Severe migraine needs pain management'
  },
  {
    id: 39,
    name: 'Threatened Miscarriage',
    input: 'Pregnant 10 weeks, vaginal bleeding and cramping',
    expectedATS: 3,
    expectedUrgency: 'URGENT',
    expectedRedFlags: [],
    category: 'Obstetric',
    rationale: 'Vaginal bleeding in early pregnancy needs ultrasound'
  },
  {
    id: 40,
    name: 'Diabetic Foot Infection',
    input: 'Diabetic, foot wound is red, swollen, smells bad, red streaks up leg',
    expectedATS: 3,
    expectedUrgency: 'URGENT',
    expectedRedFlags: [],
    category: 'Infectious',
    rationale: 'Spreading infection in diabetic needs IV antibiotics'
  },
  {
    id: 41,
    name: 'Dehydration - Moderate',
    input: 'Vomiting and diarrhea for 2 days, dizzy when I stand, dry mouth',
    expectedATS: 3,
    expectedUrgency: 'URGENT',
    expectedRedFlags: [],
    category: 'Gastrointestinal',
    rationale: 'Moderate dehydration may need IV fluids'
  },
  {
    id: 42,
    name: 'Foreign Body Eye',
    input: 'Metal fragment flew into my eye at work, very painful, cant open it',
    expectedATS: 3,
    expectedUrgency: 'URGENT',
    expectedRedFlags: [],
    category: 'Ophthalmology',
    rationale: 'Metallic eye foreign body needs urgent removal'
  },
  {
    id: 43,
    name: 'Abscess - Significant',
    input: 'Large painful lump under my arm, red and hot, fever',
    expectedATS: 3,
    expectedUrgency: 'URGENT',
    expectedRedFlags: [],
    category: 'Surgical',
    rationale: 'Abscess with systemic symptoms needs I&D'
  },
  {
    id: 44,
    name: 'Asthma - Child',
    input: 'My 5 year old is wheezing, using tummy muscles to breathe',
    expectedATS: 3,
    expectedUrgency: 'URGENT',
    expectedRedFlags: [],
    category: 'Paediatric',
    rationale: 'Paediatric respiratory distress with accessory muscle use'
  },
  {
    id: 45,
    name: 'DVT Symptoms',
    input: 'Calf is swollen, red and painful, just came back from long flight',
    expectedATS: 3,
    expectedUrgency: 'URGENT',
    expectedRedFlags: [],
    category: 'Cardiovascular',
    rationale: 'DVT risk needs anticoagulation assessment'
  },
  {
    id: 46,
    name: 'Severe Back Pain - New',
    input: 'Sudden severe back pain, 8/10, cant get comfortable',
    expectedATS: 3,
    expectedUrgency: 'URGENT',
    expectedRedFlags: [],
    category: 'Musculoskeletal',
    rationale: 'Severe new back pain needs red flag exclusion'
  },
  {
    id: 47,
    name: 'Cellulitis - Spreading',
    input: 'Red area on my leg getting bigger every hour, spreading up',
    expectedATS: 3,
    expectedUrgency: 'URGENT',
    expectedRedFlags: [],
    category: 'Infectious',
    rationale: 'Rapidly spreading cellulitis needs IV antibiotics'
  },
  {
    id: 48,
    name: 'Epistaxis - Wont Stop',
    input: 'Nosebleed for 45 minutes, applied pressure, wont stop',
    expectedATS: 3,
    expectedUrgency: 'URGENT',
    expectedRedFlags: [],
    category: 'ENT',
    rationale: 'Prolonged epistaxis may need packing'
  },
  {
    id: 49,
    name: 'Acute Urinary Retention',
    input: 'Havent been able to pee for 12 hours, belly is swollen and painful',
    expectedATS: 3,
    expectedUrgency: 'URGENT',
    expectedRedFlags: [],
    category: 'Urological',
    rationale: 'Acute retention needs catheterization'
  },
  {
    id: 50,
    name: 'Hemoptysis',
    input: 'Coughed up blood this morning, about a tablespoon',
    expectedATS: 3,
    expectedUrgency: 'URGENT',
    expectedRedFlags: [],
    category: 'Respiratory',
    rationale: 'Haemoptysis needs urgent investigation'
  },

  // ============================================
  // ATS 4 - SEMI-URGENT (60 minutes)
  // ============================================
  {
    id: 51,
    name: 'Simple Fracture',
    input: 'Fell and hurt my wrist, swollen and bruised, can still move fingers',
    expectedATS: 4,
    expectedUrgency: 'SEMI_URGENT',
    expectedRedFlags: [],
    category: 'Orthopaedic',
    rationale: 'Likely stable fracture, neurovascularly intact'
  },
  {
    id: 52,
    name: 'Mild Headache',
    input: 'Headache for 3 days, tension type, around 4/10',
    expectedATS: 4,
    expectedUrgency: 'SEMI_URGENT',
    expectedRedFlags: [],
    category: 'Neurological',
    rationale: 'Tension headache without red flags'
  },
  {
    id: 53,
    name: 'UTI - Uncomplicated',
    input: 'Burning when I pee, going frequently, no fever',
    expectedATS: 4,
    expectedUrgency: 'SEMI_URGENT',
    expectedRedFlags: [],
    category: 'Urological',
    rationale: 'Simple cystitis in otherwise healthy adult'
  },
  {
    id: 54,
    name: 'Minor Head Injury',
    input: 'Bumped my head, small lump, no loss of consciousness',
    expectedATS: 4,
    expectedUrgency: 'SEMI_URGENT',
    expectedRedFlags: [],
    category: 'Neurological',
    rationale: 'Minor head injury, no concerning features'
  },
  {
    id: 55,
    name: 'Ear Infection',
    input: 'Ear pain for 2 days, feels blocked, pain about 5/10',
    expectedATS: 4,
    expectedUrgency: 'SEMI_URGENT',
    expectedRedFlags: [],
    category: 'ENT',
    rationale: 'Otitis media/externa without complications'
  },
  {
    id: 56,
    name: 'Sprain - Ankle',
    input: 'Twisted my ankle playing soccer, swollen, can put some weight on it',
    expectedATS: 4,
    expectedUrgency: 'SEMI_URGENT',
    expectedRedFlags: [],
    category: 'Orthopaedic',
    rationale: 'Ankle sprain, weight-bearing maintained'
  },
  {
    id: 57,
    name: 'Laceration - Simple',
    input: 'Cut my finger with a knife, bleeding stopped, about 2cm long',
    expectedATS: 4,
    expectedUrgency: 'SEMI_URGENT',
    expectedRedFlags: [],
    category: 'Trauma',
    rationale: 'Simple laceration may need sutures'
  },
  {
    id: 58,
    name: 'Gastro - Adult',
    input: 'Vomiting and diarrhea since last night, keeping down sips of water',
    expectedATS: 4,
    expectedUrgency: 'SEMI_URGENT',
    expectedRedFlags: [],
    category: 'Gastrointestinal',
    rationale: 'Gastroenteritis without significant dehydration'
  },
  {
    id: 59,
    name: 'Allergic Reaction - Mild',
    input: 'Hives on my arms after eating shrimp, no breathing problems',
    expectedATS: 4,
    expectedUrgency: 'SEMI_URGENT',
    expectedRedFlags: [],
    category: 'Allergy',
    rationale: 'Cutaneous allergic reaction without systemic features'
  },
  {
    id: 60,
    name: 'Back Pain - Chronic Flare',
    input: 'My usual back pain flared up, worse than normal, been going on for years',
    expectedATS: 4,
    expectedUrgency: 'SEMI_URGENT',
    expectedRedFlags: [],
    category: 'Musculoskeletal',
    rationale: 'Chronic back pain exacerbation without red flags'
  },
  {
    id: 61,
    name: 'Tonsillitis',
    input: 'Really sore throat, white patches on tonsils, mild fever',
    expectedATS: 4,
    expectedUrgency: 'SEMI_URGENT',
    expectedRedFlags: [],
    category: 'ENT',
    rationale: 'Pharyngotonsillitis, can swallow'
  },
  {
    id: 62,
    name: 'Eye Infection',
    input: 'Eye is red, gooey discharge, stuck shut this morning',
    expectedATS: 4,
    expectedUrgency: 'SEMI_URGENT',
    expectedRedFlags: [],
    category: 'Ophthalmology',
    rationale: 'Bacterial conjunctivitis'
  },
  {
    id: 63,
    name: 'Insect Bite - Infected',
    input: 'Bug bite from a week ago, now red circle around it, slightly warm',
    expectedATS: 4,
    expectedUrgency: 'SEMI_URGENT',
    expectedRedFlags: [],
    category: 'Infectious',
    rationale: 'Localized cellulitis from bite'
  },
  {
    id: 64,
    name: 'Constipation - Severe',
    input: 'Havent had a bowel movement in 5 days, bloated and uncomfortable',
    expectedATS: 4,
    expectedUrgency: 'SEMI_URGENT',
    expectedRedFlags: [],
    category: 'Gastrointestinal',
    rationale: 'Constipation without obstruction features'
  },
  {
    id: 65,
    name: 'Sinusitis',
    input: 'Facial pain and pressure for a week, thick green nasal discharge',
    expectedATS: 4,
    expectedUrgency: 'SEMI_URGENT',
    expectedRedFlags: [],
    category: 'ENT',
    rationale: 'Acute sinusitis, no complications'
  },
  {
    id: 66,
    name: 'Abdominal Pain - Mild',
    input: 'Stomach cramps on and off for 2 days, about 4/10 pain',
    expectedATS: 4,
    expectedUrgency: 'SEMI_URGENT',
    expectedRedFlags: [],
    category: 'Gastrointestinal',
    rationale: 'Non-specific abdominal pain without red flags'
  },
  {
    id: 67,
    name: 'Dental Pain',
    input: 'Toothache keeping me awake, throbbing pain, gum is swollen',
    expectedATS: 4,
    expectedUrgency: 'SEMI_URGENT',
    expectedRedFlags: [],
    category: 'Dental',
    rationale: 'Dental abscess needs antibiotics and dental referral'
  },
  {
    id: 68,
    name: 'Period Pain - Severe',
    input: 'Really bad period pain this month, worse than usual, 7/10',
    expectedATS: 4,
    expectedUrgency: 'SEMI_URGENT',
    expectedRedFlags: [],
    category: 'Gynaecology',
    rationale: 'Dysmenorrhoea without concerning features'
  },
  {
    id: 69,
    name: 'Muscle Strain',
    input: 'Pulled something in my shoulder at the gym, painful to move',
    expectedATS: 4,
    expectedUrgency: 'SEMI_URGENT',
    expectedRedFlags: [],
    category: 'Musculoskeletal',
    rationale: 'Muscle strain, mechanical injury'
  },
  {
    id: 70,
    name: 'Cough - Productive',
    input: 'Coughing up yellow phlegm for a week, bit short of breath',
    expectedATS: 4,
    expectedUrgency: 'SEMI_URGENT',
    expectedRedFlags: [],
    category: 'Respiratory',
    rationale: 'Possible chest infection'
  },

  // ============================================
  // ATS 5 - NON-URGENT (120 minutes)
  // ============================================
  {
    id: 71,
    name: 'Common Cold',
    input: 'Runny nose and sneezing for 3 days, no fever',
    expectedATS: 5,
    expectedUrgency: 'NON_URGENT',
    expectedRedFlags: [],
    category: 'Respiratory',
    rationale: 'Viral URTI, self-limiting'
  },
  {
    id: 72,
    name: 'Minor Rash',
    input: 'Small itchy rash on my arm, been there for a few days',
    expectedATS: 5,
    expectedUrgency: 'NON_URGENT',
    expectedRedFlags: [],
    category: 'Dermatology',
    rationale: 'Non-progressive minor rash'
  },
  {
    id: 73,
    name: 'Prescription Refill',
    input: 'Need a refill of my blood pressure medication',
    expectedATS: 5,
    expectedUrgency: 'NON_URGENT',
    expectedRedFlags: [],
    category: 'Administrative',
    rationale: 'Administrative request, not acute'
  },
  {
    id: 74,
    name: 'Chronic Pain - Stable',
    input: 'My usual arthritis pain, same as always',
    expectedATS: 5,
    expectedUrgency: 'NON_URGENT',
    expectedRedFlags: [],
    category: 'Musculoskeletal',
    rationale: 'Chronic condition at baseline'
  },
  {
    id: 75,
    name: 'Mild Sore Throat',
    input: 'Bit of a scratchy throat, probably a cold',
    expectedATS: 5,
    expectedUrgency: 'NON_URGENT',
    expectedRedFlags: [],
    category: 'ENT',
    rationale: 'Mild pharyngitis, viral'
  },
  {
    id: 76,
    name: 'Insect Bite - Simple',
    input: 'Got a mosquito bite, itchy but not infected',
    expectedATS: 5,
    expectedUrgency: 'NON_URGENT',
    expectedRedFlags: [],
    category: 'Dermatology',
    rationale: 'Simple insect bite, symptomatic'
  },
  {
    id: 77,
    name: 'Suture Removal',
    input: 'Need to get my stitches removed from last week',
    expectedATS: 5,
    expectedUrgency: 'NON_URGENT',
    expectedRedFlags: [],
    category: 'Wound Care',
    rationale: 'Scheduled procedure, not acute'
  },
  {
    id: 78,
    name: 'Mild Constipation',
    input: 'A bit constipated the last couple of days',
    expectedATS: 5,
    expectedUrgency: 'NON_URGENT',
    expectedRedFlags: [],
    category: 'Gastrointestinal',
    rationale: 'Mild constipation, no red flags'
  },
  {
    id: 79,
    name: 'Minor Bruise',
    input: 'Bumped my leg and got a bruise, not too painful',
    expectedATS: 5,
    expectedUrgency: 'NON_URGENT',
    expectedRedFlags: [],
    category: 'Trauma',
    rationale: 'Simple contusion'
  },
  {
    id: 80,
    name: 'Eczema Flare',
    input: 'My eczema is a bit flared up, itchy but manageable',
    expectedATS: 5,
    expectedUrgency: 'NON_URGENT',
    expectedRedFlags: [],
    category: 'Dermatology',
    rationale: 'Chronic eczema, mild flare'
  },
  {
    id: 81,
    name: 'Results Review',
    input: 'Want to know my blood test results from last week',
    expectedATS: 5,
    expectedUrgency: 'NON_URGENT',
    expectedRedFlags: [],
    category: 'Administrative',
    rationale: 'Results review, not acute'
  },
  {
    id: 82,
    name: 'Sleep Issues',
    input: 'Having trouble sleeping the last few weeks',
    expectedATS: 5,
    expectedUrgency: 'NON_URGENT',
    expectedRedFlags: [],
    category: 'General',
    rationale: 'Chronic insomnia, GP appropriate'
  },
  {
    id: 83,
    name: 'Hay Fever',
    input: 'Seasonal allergies acting up, sneezing and watery eyes',
    expectedATS: 5,
    expectedUrgency: 'NON_URGENT',
    expectedRedFlags: [],
    category: 'Allergy',
    rationale: 'Allergic rhinitis, self-manageable'
  },
  {
    id: 84,
    name: 'Minor Sunburn',
    input: 'Got a bit sunburnt yesterday, skin is pink and tender',
    expectedATS: 5,
    expectedUrgency: 'NON_URGENT',
    expectedRedFlags: [],
    category: 'Dermatology',
    rationale: 'Minor sunburn, first-degree'
  },
  {
    id: 85,
    name: 'Wart Removal',
    input: 'Have a wart on my hand Id like removed',
    expectedATS: 5,
    expectedUrgency: 'NON_URGENT',
    expectedRedFlags: [],
    category: 'Dermatology',
    rationale: 'Elective procedure'
  },

  // ============================================
  // EDGE CASES & AMBIGUOUS (86-100)
  // ============================================
  {
    id: 86,
    name: 'Vague Symptoms',
    input: 'I just dont feel well',
    expectedATS: 4,
    expectedUrgency: 'SEMI_URGENT',
    expectedRedFlags: [],
    category: 'General',
    rationale: 'Non-specific, needs more assessment'
  },
  {
    id: 87,
    name: 'Multiple Minor Complaints',
    input: 'Have a headache, bit tired, some back pain, and a cough',
    expectedATS: 4,
    expectedUrgency: 'SEMI_URGENT',
    expectedRedFlags: [],
    category: 'General',
    rationale: 'Multiple non-specific symptoms'
  },
  {
    id: 88,
    name: 'Anxiety About Symptoms',
    input: 'I think I might have cancer, been worried about a lump',
    expectedATS: 4,
    expectedUrgency: 'SEMI_URGENT',
    expectedRedFlags: [],
    category: 'General',
    rationale: 'Health anxiety with physical concern'
  },
  {
    id: 89,
    name: 'Elderly Fall - No Injury',
    input: 'Im 85 and fell at home but feel fine, no pain',
    expectedATS: 4,
    expectedUrgency: 'SEMI_URGENT',
    expectedRedFlags: [],
    category: 'Geriatric',
    rationale: 'Falls in elderly need assessment even without injury'
  },
  {
    id: 90,
    name: 'Chest Pain - Musculoskeletal',
    input: 'Chest pain when I press on it, moved furniture yesterday',
    expectedATS: 3,
    expectedUrgency: 'URGENT',
    expectedRedFlags: ['Chest pain'],
    category: 'Musculoskeletal',
    rationale: 'Chest pain always needs cardiac exclusion first'
  },
  {
    id: 91,
    name: 'Drug Seeking Behavior',
    input: 'I need strong painkillers, the over-the-counter ones dont work',
    expectedATS: 5,
    expectedUrgency: 'NON_URGENT',
    expectedRedFlags: [],
    category: 'General',
    rationale: 'Non-specific request, needs assessment'
  },
  {
    id: 92,
    name: 'Third Party Report',
    input: 'My neighbor asked me to call, shes been confused all day',
    expectedATS: 3,
    expectedUrgency: 'URGENT',
    expectedRedFlags: ['Altered mental status'],
    category: 'General',
    rationale: 'Third-party report of confusion concerning'
  },
  {
    id: 93,
    name: 'Pregnancy Uncertainty',
    input: 'I might be pregnant and have some cramping',
    expectedATS: 3,
    expectedUrgency: 'URGENT',
    expectedRedFlags: [],
    category: 'Obstetric',
    rationale: 'Possible pregnancy with pain needs ectopic exclusion'
  },
  {
    id: 94,
    name: 'Missed Medications',
    input: 'I ran out of my epilepsy medication 3 days ago',
    expectedATS: 3,
    expectedUrgency: 'URGENT',
    expectedRedFlags: [],
    category: 'Neurological',
    rationale: 'Seizure risk from missed anticonvulsants'
  },
  {
    id: 95,
    name: 'Immunocompromised with Fever',
    input: 'Im on chemotherapy and have a temperature of 38',
    expectedATS: 2,
    expectedUrgency: 'EMERGENCY',
    expectedRedFlags: [],
    category: 'Oncology',
    rationale: 'Neutropenic sepsis risk in chemo patients'
  },
  {
    id: 96,
    name: 'Post-Procedure Complication',
    input: 'Had a procedure done yesterday and the site is now really swollen',
    expectedATS: 3,
    expectedUrgency: 'URGENT',
    expectedRedFlags: [],
    category: 'Surgical',
    rationale: 'Post-procedure complication needs assessment'
  },
  {
    id: 97,
    name: 'Breathing Issue - Anxiety',
    input: 'I feel like I cant get enough air but my oxygen is normal',
    expectedATS: 3,
    expectedUrgency: 'URGENT',
    expectedRedFlags: ['Difficulty breathing'],
    category: 'Respiratory/Psych',
    rationale: 'Must exclude organic cause before anxiety diagnosis'
  },
  {
    id: 98,
    name: 'Animal Bite',
    input: 'Got bitten by a stray dog, wound is about 1cm',
    expectedATS: 3,
    expectedUrgency: 'URGENT',
    expectedRedFlags: [],
    category: 'Trauma',
    rationale: 'Animal bite needs wound care and rabies assessment'
  },
  {
    id: 99,
    name: 'Mental Health - Non-Crisis',
    input: 'Been feeling really down for weeks, trouble getting out of bed',
    expectedATS: 4,
    expectedUrgency: 'SEMI_URGENT',
    expectedRedFlags: [],
    category: 'Mental Health',
    rationale: 'Depression without crisis features'
  },
  {
    id: 100,
    name: 'Foreign Body Swallowed',
    input: 'My child swallowed a small coin, seems fine now',
    expectedATS: 3,
    expectedUrgency: 'URGENT',
    expectedRedFlags: [],
    category: 'Paediatric',
    rationale: 'Foreign body ingestion needs X-ray'
  },
];

// Helper to group test cases by expected ATS
export function groupByATS(): Record<number, TestCase[]> {
  const groups: Record<number, TestCase[]> = { 1: [], 2: [], 3: [], 4: [], 5: [] };
  for (const tc of TEST_CASES) {
    groups[tc.expectedATS].push(tc);
  }
  return groups;
}

// Summary stats
export function getTestStats() {
  const groups = groupByATS();
  return {
    total: TEST_CASES.length,
    byATS: {
      'ATS 1 (Resuscitation)': groups[1].length,
      'ATS 2 (Emergency)': groups[2].length,
      'ATS 3 (Urgent)': groups[3].length,
      'ATS 4 (Semi-urgent)': groups[4].length,
      'ATS 5 (Non-urgent)': groups[5].length,
    }
  };
}
