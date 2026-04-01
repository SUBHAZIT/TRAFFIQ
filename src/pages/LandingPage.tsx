import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Activity, Radio, ChevronRight, Zap, Eye, MapPin, AlertTriangle, Building2, Globe, Lock, Contrast, ChevronDown, Check, Menu, X } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import heroImage from '@/assets/hero-ux4g.png';
import traffiqLogo from '@/assets/TRAFFIQ LOGO.png';

const translations: any = {
  en: {
    gov: 'GOVERNMENT OF INDIA',
    ministry: 'MINISTRY OF URBAN DEVELOPMENT',
    accessibility: 'ACCESSIBILITY SUPPORT',
    mission: 'DIGITAL INDIA MISSION',
    heroTitle: 'MODERNIZING URBAN & MOBILITY & SAFETY',
    heroSub: 'TRAFFIQ IS INDIA\'S PREMIER INTELLIGENT TRAFFIC MANAGEMENT ECOSYSTEM, INTEGRATING AI-DRIVEN COORDINATION WITH EMERGENCY RESPONSE INFRASTRUCTURE.',
    ctaDashboard: 'ACCESS DASHBOARD',
    ctaNetwork: 'VIEW NETWORK',
    servicesTag: 'CORE INFRASTRUCTURE',
    servicesTitle: 'SOLUTIONS FOR SMART GOVERNANCE',
    secureAccess: 'SECURE ACCESS FOR REGISTERED PERSONNEL',
    secureSub: 'AUTHORIZED GOVERNMENT OFFICIALS, EMERGENCY OPERATORS, AND REGISTERED TRAFFIC PERSONNEL MAY PROCEED TO THE SECURE CONTROL TERMINAL.',
    enterTerminal: 'ENTER CONTROL TERMINAL',
    footerMission: 'EMPOWERING INDIAN CITIES WITH INTELLIGENT INFRASTRUCTURE.',
    quickLinks: 'QUICK LINKS',
    serviceDir: 'SERVICE DIRECTORY',
    incidentRep: 'INCIDENT REPORTS',
    policyDoc: 'POLICY DOCUMENTATION',
    helpdesk: 'CONTACT HELPDESK',
    missionTag: 'MISSION',
    digitalIndia: 'DESIGNED UNDER THE DIGITAL INDIA INITIATIVE TO STREAMLINE URBAN MOBILITY.',
    privacy: 'PRIVACY POLICY',
    terms: 'TERMS OF SERVICE',
    audit: 'AUDIT LOGS',
    copyright: '© 2026 MINISTRY OF URBAN DEVELOPMENT · GOVERNMENT OF INDIA',
    navServices: 'SERVICES',
    navImpact: 'IMPACT',
    navAbout: 'ABOUT',
    login: 'LOGIN',
    langName: 'ENGLISH'
  },
  hi: {
    gov: 'भारत सरकार',
    ministry: 'शहरी विकास मंत्रालय',
    accessibility: 'एक्सेसिबिलिटी सपोर्ट',
    mission: 'डिजिटल इंडिया मिशन',
    heroTitle: 'शहरी गतिशीलता & और सुरक्षा का आधुनिकीकरण',
    heroSub: 'TRAFFIQ भारत का प्रमुख इंटेलिजेंट ट्रैफिक मैनेजमेंट इकोसिस्टम है, जो आपातकालीन प्रतिक्रिया बुनियादी ढांचे के साथ एआई-संचालित समन्वय को एकीकृत करता है।',
    ctaDashboard: 'डैशबोर्ड का उपयोग करें',
    ctaNetwork: 'नेटवर्क देखें',
    servicesTag: 'कोर इंफ्रास्ट्रक्चर',
    servicesTitle: 'स्मार्ट गवर्नेंस के लिए समाधान',
    secureAccess: 'पंजीकृत कर्मियों के लिए सुरक्षित पहुंच',
    secureSub: 'अधिकृत सरकारी अधिकारी, आपातकालीन ऑपरेटर और पंजीकृत यातायात कर्मी सुरक्षित नियंत्रण टर्मिनल पर जा सकते हैं।',
    enterTerminal: 'कंट्रोल टर्मिनल में प्रवेश करें',
    footerMission: 'बुद्धिमान बुनियादी ढांचे के साथ भारतीय शहरों को सशक्त बनाना।',
    quickLinks: 'त्वरित लिंक',
    serviceDir: 'सेवा निर्देशिका',
    incidentRep: 'घटना रिपोर्ट',
    policyDoc: 'नीति प्रलेखन',
    helpdesk: 'संपर्क हेल्पडेस्क',
    missionTag: 'मिशन',
    digitalIndia: 'शहरी गतिशीलता को सुव्यवस्थित करने के लिए डिजिटल इंडिया पहल के तहत डिज़ाइन किया गया।',
    privacy: 'गोपनीयता नीति',
    terms: 'सेवा की शर्तें',
    audit: 'ऑडिट लॉग',
    copyright: '© 2026 शहरी विकास मंत्रालय · भारत सरकार',
    navServices: 'सेवाएं',
    navImpact: 'प्रभाव',
    navAbout: 'हमारे बारे में',
    login: 'लॉगिन',
    langName: 'हिंदी'
  },
  mr: {
    gov: 'भारत सरकार',
    ministry: 'नगरविकास मंत्रालय',
    accessibility: 'प्रवेशयोग्यता समर्थन',
    mission: 'डिजिटल इंडिया मिशन',
    heroTitle: 'शहरी गतिशीलता & आणि सुरक्षेचे आधुनिकीकरण',
    heroSub: 'TRAFFIQ ही भारताची प्रमुख इंटेलिजेंट ट्रॅफिक मॅनेजमेंट इकोसिस्टम आहे, जी आपत्कालीन प्रतिसाद पायाभूत सुविधांशी समन्वय साधते.',
    ctaDashboard: 'डॅशबोर्डवर जा',
    ctaNetwork: 'नेटवर्क पहा',
    servicesTag: 'कोर पायाभूत सुविधा',
    servicesTitle: 'स्मार्ट गव्हर्नन्ससाठी उपाय',
    secureAccess: 'नोंदणीकृत कर्मचाऱ्यांसाठी सुरक्षित प्रवेश',
    secureSub: 'अधिकृत सरकारी अधिकारी आणि आपत्कालीन ऑपरेटर सुरक्षित नियंत्रण टर्मिनलवर जाऊ शकतात.',
    enterTerminal: 'कंट्रोल टर्मिनलमध्ये प्रवेश करा',
    footerMission: 'शहरी गतिशीलता सुव्यवस्थित करण्यासाठी डिजिटल इंडिया उपक्रमांतर्गत डिझाइन केलेले.',
    quickLinks: 'द्रुत दुवे',
    serviceDir: 'सेवा निर्देशिका',
    incidentRep: 'घटना अहवाल',
    policyDoc: 'धोरण दस्तऐवजीकरण',
    helpdesk: 'संपर्क मदत केंद्र',
    missionTag: 'मिशन',
    digitalIndia: 'डिजिटल इंडिया उपक्रमांतर्गत डिझाइन केलेले.',
    privacy: 'गोपनीयता धोरण',
    terms: 'सेवा अटी',
    audit: 'ऑडिट लॉग',
    copyright: '© 2026 नगरविकास मंत्रालय · भारत सरकार',
    navServices: 'सेवा',
    navImpact: 'प्रभाव',
    navAbout: 'बद्दल',
    login: 'लॉगिन',
    langName: 'मराठी'
  },
  ta: {
    gov: 'இந்திய அரசு',
    ministry: 'வீட்டுவசதி மற்றும் நகர்ப்புற விவகாரங்கள் அமைச்சகம்',
    accessibility: 'அணுகல் ஆதரவு',
    mission: 'டிஜிட்டல் இந்தியா மிஷன்',
    heroTitle: 'நகர்ப்புற இயக்கம் & மற்றும் பாதுகாப்பை நவீனப்படுத்துதல்',
    heroSub: 'TRAFFIQ இந்தியாவின் முதன்மையான அறிவார்ந்த போக்குவரத்து மேலாண்மை சுற்றுச்சூழல் அமைப்பாகும்.',
    ctaDashboard: 'டாஷ்போர்டை அணுகவும்',
    ctaNetwork: 'நெட்வொர்க்கைப் பார்க்கவும்',
    servicesTag: 'முக்கிய உள்கட்டமைப்பு',
    servicesTitle: 'ஸ்மார்ட் நிர்வாகத்திற்கான தீர்வுகள்',
    secureAccess: 'பதிவுசெய்யப்பட்ட பணியாளர்களுக்கான பாதுகாப்பான அணுகல்',
    secureSub: 'அங்கீகரிக்கப்பட்ட அரசு அதிகாரிகள் பாதுகாப்பான கட்டுப்பாட்டு முனையத்திற்குச் செல்லலாம்.',
    enterTerminal: 'கட்டுப்பாட்டு முனையத்தில் நுழையவும்',
    footerMission: 'நகர்ப்புற இயக்கத்தை சீரமைக்க டிஜிட்டல் இந்தியா திட்டத்தின் கீழ் வடிவமைக்கப்பட்டுள்ளது.',
    quickLinks: 'விரைவான இணைப்புகள்',
    serviceDir: 'சேவை அடைவு',
    incidentRep: 'சம்பவ அறிக்கைகள்',
    policyDoc: 'கொள்கை ஆவணங்கள்',
    helpdesk: 'உதவி மையத்தைத் தொடர்பு கொள்ளவும்',
    missionTag: 'மிஷன்',
    digitalIndia: 'டிஜிட்டல் இந்தியா முயற்சியின் கீழ் வடிவமைக்கப்பட்டது.',
    privacy: 'தனியுரிமைக் கொள்கை',
    terms: 'சேவை விதிமுறைகள்',
    audit: 'தணிக்கை பதிவுகள்',
    copyright: '© 2026 நகர்ப்புற வளர்ச்சி அமைச்சகம் · இந்திய அரசு',
    navServices: 'சேவைகள்',
    navImpact: 'தாக்கம்',
    navAbout: 'பற்றி',
    login: 'உள்நுழை',
    langName: 'தமிழ்'
  },
  te: {
    gov: 'భారత ప్రభుత్వం',
    ministry: 'పట్టణాభివృద్ధి మంత్రిత్వ శాఖ',
    accessibility: 'యాక్సెసిబిలిటీ సపోర్ట్',
    mission: 'డిజిటల్ ఇండియా మిషన్',
    heroTitle: 'పట్టణ చలనశీలత & మరియు భద్రతను ఆధునీకరించడం',
    heroSub: 'TRAFFIQ భారతదేశపు ప్రధాన ఇంటెలిజెంట్ ట్రాఫిక్ మేనేజ్‌మెంట్ ఎకోసిస్టమ్.',
    ctaDashboard: 'డాష్‌బోర్డ్‌ని యాక్సెస్ చేయండి',
    ctaNetwork: 'నెట్‌వర్క్‌ను వీక్షించండి',
    servicesTag: 'కోర్ ఇన్ఫ్రాస్ట్రక్చర్',
    servicesTitle: 'స్మార్ట్ గవర్నెన్స్ కోసం పరిష్కారాలు',
    secureAccess: 'నమోదిత సిబ్బందికి సురక్షిత ప్రవేశం',
    secureSub: 'అధికారిక ప్రభుత్వ అధికారులు సురక్షిత నియంత్రణ టెర్మినల్‌కు వెళ్లవచ్చు.',
    enterTerminal: 'నియంత్రణ టెర్మినల్‌లోకి ప్రవేశించండి',
    footerMission: 'డిజిటల్ ఇండియా చొరవ కింద పట్టణ చలనశీలతను క్రమబద్ధీకరించడానికి రూపొందించబడింది.',
    quickLinks: 'త్వరిత లింకులు',
    serviceDir: 'సర్వీస్ డైరెక్టరీ',
    incidentRep: 'సంఘటన నివేదికలు',
    policyDoc: 'విధాన డాక్యుమెంటేషన్',
    helpdesk: 'హెల్ప్‌డెస్క్‌ని సంప్రదించండి',
    missionTag: 'మిషన్',
    digitalIndia: 'డిజిటల్ ఇండియా చొరవ కింద రూపొందించబడింది.',
    privacy: 'గోప్యతా విధానం',
    terms: 'సేవా నిబంధనలు',
    audit: 'ఆడిట్ లాగ్‌లు',
    copyright: '© 2026 పట్టణాభివృద్ధి మంత్రిత్వ శాఖ · భారత ప్రభుత్వం',
    navServices: 'సేవలు',
    navImpact: 'ప్రభావం',
    navAbout: 'గురించి',
    login: 'లాగిన్',
    langName: 'తెలుగు'
  }
};

const servicesList = [
  {
    icon: Eye,
    title: { 
      en: 'ADAPTIVE TRAFFIC CONTROL', 
      hi: 'अनुकूलन योग्य यातायात नियंत्रण',
      mr: 'अनुकूलन योग्य वाहतूक नियंत्रण',
      ta: 'தகவமைப்பு போக்குவரத்து கட்டுப்பாடு',
      te: 'అడాప్టివ్ ట్రాఫిక్ కంట్రోల్'
    },
    description: { 
      en: 'AI-DRIVEN SIGNAL SYNCHRONIZATION THAT RESPONDS TO REAL-TIME TRAFFIC DENSITY.', 
      hi: 'एआई-संचालित सिग्नल सिंक्रोनाइज़ेशन जो वास्तविक समय के यातायात घनत्व पर प्रतिक्रिया करता है।',
      mr: 'वास्तविक वेळेच्या वाहतूक घनतेनुसार सिग्नल सिंक्रोनाइझेशन.',
      ta: 'ரியல் டைம் டிராஃபிக் டென்சிட்டிக்கு பதிலளிக்கும் ஏஐ சிக்னல் ஒத்திசைவு.',
      te: 'నిజ-సమయ ట్రాఫిక్ సాంద్రతకు ప్రతిస్పందించే AI సిగ్నల్ సమకాలీకరణ.'
    },
  },
  {
    icon: Zap,
    title: { 
      en: 'EMERGENCY GREEN CORRIDOR', 
      hi: 'आपातकालीन ग्रीन कॉरिडोर',
      mr: 'आणीबाणी ग्रीन कॉरिडॉर',
      ta: 'அவசர கால கிரீன் காரிடார்',
      te: 'ఎమర్జెన్సీ గ్రీన్ కారిడార్'
    },
    description: { 
      en: 'IMMEDIATE SIGNAL PREEMPTION FOR AMBULANCES AND FIRE ENGINES.', 
      hi: 'एम्बुलेंस और दमकल गाड़ियों के लिए तत्काल सिग्नल प्राथमिकता।',
      mr: 'रुग्णवाहिका आणि अग्निशमन दलाच्या गाड्यांसाठी तात्काळ सिग्नल प्राधान्य.',
      ta: 'ஆம்புலன்ஸ் மற்றும் தீயணைப்பு வண்டிகளுக்கு உடனடி சிக்னல் முன்னுரிமை.',
      te: 'అంబులెన్సులు మరియు ఫైర్ ఇంజిన్ల కోసం తక్షణ సిగ్నల్ ప్రాధాన్యత.'
    },
  },
  {
    icon: MapPin,
    title: { 
      en: 'PRECISION ANALYTICS', 
      hi: 'सटीक विश्लेषिकी',
      mr: 'अचूक विश्लेषण',
      ta: 'துல்லியமான பகுப்பாய்வு',
      te: 'ప్రెసిషన్ అనలిటిక్స్'
    },
    description: { 
      en: 'ADVANCED DATA INSIGHTS FOR URBAN PLANNERS TO IDENTIFY BOTTLENECKS.', 
      hi: 'शहरी योजनाकारों के लिए बाधाओं की पहचान करने के लिए उन्नत डेटा अंतर्दृष्टि।',
      mr: 'शहरी नियोजकांसाठी प्रगत डेटा अंतर्दृष्टी.',
      ta: 'நகர்ப்புறத் திட்டமிடுபவர்களுக்கு மேம்பட்ட தரவு நுண்ணறிவு.',
      te: 'పట్టణ ప్రణాళికాకర్తల కోసం అధునాతన డేటా అంతర్దృష్టులు.'
    },
  },
  {
    icon: AlertTriangle,
    title: { 
      en: 'PUBLIC SAFETY ALERTS', 
      hi: 'सार्वजनिक सुरक्षा अलर्ट',
      mr: 'सार्वजनिक सुरक्षा सतर्कता',
      ta: 'பொது பாதுகாப்பு விழிப்பூட்டல்கள்',
      te: 'పబ్లిక్ సేఫ్టీ అలర్ట్‌లు'
    },
    description: { 
      en: 'REAL-TIME INCIDENT REPORTING AND BROADCASTING TO COMMUTERS.', 
      hi: 'यात्रियों को वास्तविक समय की घटना रिपोर्टिंग और प्रसारण।',
      mr: 'प्रवाशांसाठी वास्तविक वेळेत घटना अहवाल.',
      ta: 'பயணிகளுக்கு ரியல் டைம் சம்பவ அறிக்கை மற்றும் ஒளிபரப்பு.',
      te: 'ప్రయాణికులకు నిజ-సమయ సంఘటన రిపోర్టింగ్ మరియు ప్రసారం.'
    },
  },
];

export default function LandingPage() {
  const [lang, setLang] = useState<'en' | 'hi' | 'mr' | 'ta' | 'te'>('en');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [fontSize, setFontSize] = useState<number>(1);
  const [highContrast, setHighContrast] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<'lang' | 'access' | null>(null);
  
  const dropdownRef = useRef<HTMLDivElement>(null);
  const t = translations[lang] || translations['en'];

  const fontSizeClass = fontSize === 1 ? 'text-base' : fontSize === 1.2 ? 'text-lg' : 'text-xl';

  const { session, role, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && session && role) {
      if (role === 'admin') navigate('/dashboard');
      else if (role === 'driver') navigate('/driver');
      else navigate('/citizen');
    }
  }, [session, role, loading, navigate]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className={`min-h-screen transition-all ${highContrast ? 'bg-black text-yellow-400' : 'bg-white text-primary'} ${fontSizeClass} selection:bg-primary selection:text-white uppercase tracking-wider`}>
      {/* GOV TOP BAR */}
      <div className={`${highContrast ? 'bg-yellow-400 text-black' : 'bg-primary text-white'} relative z-[100] px-4 py-2 text-[10px] sm:text-xs font-black transition-colors`}>
        <div className="container flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <Building2 className="h-3 w-3" />
              {t.gov}
            </span>
            <span className="hidden sm:inline-block border-l border-white/40 pl-4 uppercase tracking-wider opacity-80">
              {t.ministry}
            </span>
          </div>
          
          <div className="flex items-center gap-6" ref={dropdownRef}>
            {/* ACCESSIBILITY DROPDOWN */}
            <div className="relative">
              <button 
                onClick={() => setOpenDropdown(openDropdown === 'access' ? null : 'access')}
                className="flex items-center gap-2 hover:underline"
              >
                <span>{t.accessibility}</span>
                <ChevronDown className={`h-3 w-3 transition-transform ${openDropdown === 'access' ? 'rotate-180' : ''}`} />
              </button>
              
              <AnimatePresence>
                {openDropdown === 'access' && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className={`absolute right-0 mt-2 w-48 rounded border shadow-2xl ${highContrast ? 'bg-black border-yellow-400 text-yellow-400' : 'bg-white border-primary/10 text-primary'}`}
                  >
                    <div className="p-4 space-y-4">
                      <div>
                        <span className="text-[10px] opacity-60 mb-2 block">FONT SIZE</span>
                        <div className="flex items-center justify-between gap-1">
                          {[1, 1.2, 1.4].map((size) => (
                            <button
                              key={size}
                              onClick={() => setFontSize(size)}
                              className={`flex-1 rounded p-2 transition-all ${fontSize === size ? (highContrast ? 'bg-yellow-400 text-black' : 'bg-primary text-white') : (highContrast ? 'hover:bg-yellow-400/20' : 'hover:bg-primary/5')}`}
                            >
                              {size === 1 ? 'A-' : size === 1.2 ? 'A' : 'A+'}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="pt-2 border-t border-current opacity-20" />
                      <button 
                        onClick={() => setHighContrast(!highContrast)} 
                        className={`flex w-full items-center justify-between rounded p-2 transition-all ${highContrast ? 'hover:bg-yellow-400/20' : 'hover:bg-primary/5'}`}
                      >
                        <span className="flex items-center gap-2">
                          <Contrast className="h-4 w-4" />
                          CONTRAST
                        </span>
                        {highContrast && <Check className="h-3 w-3" />}
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* LANGUAGE DROPDOWN */}
            <div className="relative">
              <button 
                onClick={() => setOpenDropdown(openDropdown === 'lang' ? null : 'lang')}
                className="flex items-center gap-2 hover:underline border-l border-white/20 pl-6"
              >
                <span>{t.langName}</span>
                <ChevronDown className={`h-3 w-3 transition-transform ${openDropdown === 'lang' ? 'rotate-180' : ''}`} />
              </button>

              <AnimatePresence>
                {openDropdown === 'lang' && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className={`absolute right-0 mt-2 w-48 rounded border shadow-2xl max-h-64 overflow-y-auto ${highContrast ? 'bg-black border-yellow-400 text-yellow-400' : 'bg-white border-primary/10 text-primary'}`}
                  >
                    <div className="p-2 space-y-1">
                      {Object.keys(translations).map((key) => (
                        <button
                          key={key}
                          onClick={() => {
                            setLang(key as any);
                            setOpenDropdown(null);
                          }}
                          className={`flex w-full items-center justify-between rounded px-4 py-2.5 text-xs transition-all ${lang === key ? (highContrast ? 'bg-yellow-400 text-black font-black' : 'bg-primary text-white font-black') : (highContrast ? 'hover:bg-yellow-400/20' : 'hover:bg-primary/5')}`}
                        >
                          {translations[key].langName}
                          {lang === key && <Check className="h-3 w-3" />}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>

      {/* NAV */}
      <nav className={`sticky top-0 z-50 border-b-2 transition-all ${highContrast ? 'border-yellow-400 bg-black' : 'border-primary bg-white/90 backdrop-blur-xl'}`}>
        <div className="container flex h-20 items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/" className="flex items-center gap-3">
              <div className={`flex items-center justify-center rounded transition-all ${highContrast ? 'bg-yellow-400 p-1.5' : 'bg-transparent'}`}>
                <img src={traffiqLogo} alt="Logo" className="h-14 w-auto object-contain" />
              </div>
              <div className="flex flex-col">
                <span className={`text-2xl font-black leading-none tracking-tighter transition-colors ${highContrast ? 'text-yellow-400' : 'text-primary'}`}>TRAFFIQ</span>
                <span className={`text-[9px] font-bold transition-colors ${highContrast ? 'text-yellow-400/60' : 'text-primary/60'}`}>SMART CITY INDIA</span>
              </div>
            </Link>
          </div>

          <div className={`hidden items-center gap-10 text-sm font-black transition-colors md:flex ${highContrast ? 'text-yellow-400' : 'text-primary'}`}>
            <a href="#services" className="transition-all hover:scale-110 hover:text-accent">{t.navServices}</a>
            <a href="#impact" className="transition-all hover:scale-110 hover:text-accent">{t.navImpact}</a>
            <a href="#about" className="transition-all hover:scale-110 hover:text-accent">{t.navAbout}</a>
          </div>

          <div className="flex items-center gap-4">
            <Link
              to="/auth"
              className={`hidden md:flex group relative items-center gap-2 overflow-hidden rounded border-2 transition-all ${highContrast ? 'border-yellow-400 text-yellow-400 hover:bg-yellow-400 hover:text-black' : 'border-primary bg-white text-primary hover:bg-primary hover:text-white'} px-6 py-2.5 text-sm font-black`}
            >
              <span>{t.login}</span>
              <ChevronRight className="h-4 w-4" />
            </Link>
            <button 
              className="md:hidden p-2"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Nav Dropdown */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className={`md:hidden border-t-2 ${highContrast ? 'border-yellow-400 bg-black text-yellow-400' : 'border-primary bg-white'} overflow-hidden shadow-2xl absolute w-full`}
            >
              <div className="flex flex-col p-4 gap-2 text-center font-black text-sm">
                <a href="#services" onClick={() => setMobileMenuOpen(false)} className={`py-4 ${highContrast ? 'hover:bg-yellow-400/20' : 'hover:bg-primary/5'} border-b border-primary/5`}>{t.navServices}</a>
                <a href="#impact" onClick={() => setMobileMenuOpen(false)} className={`py-4 ${highContrast ? 'hover:bg-yellow-400/20' : 'hover:bg-primary/5'} border-b border-primary/5`}>{t.navImpact}</a>
                <a href="#about" onClick={() => setMobileMenuOpen(false)} className={`py-4 ${highContrast ? 'hover:bg-yellow-400/20' : 'hover:bg-primary/5'} border-b border-primary/5`}>{t.navAbout}</a>
                <Link to="/auth" onClick={() => setMobileMenuOpen(false)} className="py-4 mt-2 bg-primary text-white rounded uppercase tracking-widest">{t.login}</Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* HERO SECTION */}
      <section className="relative overflow-hidden pt-20 pb-32">
        <div className="absolute inset-0 z-0">
          <img 
            src={heroImage} 
            alt="Futuristic Indian Smart City" 
            className="h-full w-full object-cover object-center opacity-10 grayscale brightness-110"
          />
          <div className={`absolute inset-0 transition-all ${highContrast ? 'bg-black/90' : 'bg-gradient-to-b from-white via-transparent to-white'}`} />
          <div className={`absolute inset-0 grid-bg transition-opacity ${highContrast ? 'opacity-20' : 'opacity-10'}`} />
        </div>

        <div className="container relative z-10">
          <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2">
            <div className="flex flex-col items-center text-center lg:items-start lg:text-left">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={`mb-6 inline-flex items-center gap-2 rounded border-2 transition-all ${highContrast ? 'border-yellow-400 bg-black' : 'border-primary/20 bg-blue-50'} px-4 py-2`}
              >
                <Radio className={`h-4 w-4 animate-pulse transition-colors ${highContrast ? 'text-yellow-400' : 'text-primary'}`} />
                <span className={`text-xs font-black uppercase tracking-widest transition-colors ${highContrast ? 'text-yellow-400' : 'text-primary'}`}>{t.mission}</span>
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={`max-w-4xl font-black leading-[1.1] tracking-tight transition-all ${highContrast ? 'text-yellow-400' : 'text-primary'} ${fontSize === 1 ? 'text-5xl md:text-7xl lg:text-8xl' : fontSize === 1.2 ? 'text-6xl md:text-8xl lg:text-9xl' : 'text-7xl md:text-9xl'}`}
              >
                {t.heroTitle.split('&')[0]} <br />
                <span className={highContrast ? 'text-yellow-400 underline underline-offset-8 transition-colors' : 'text-gradient'}>{t.heroTitle.split('&')[1] || ''}</span>
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className={`mt-8 max-w-2xl font-black leading-relaxed transition-all ${highContrast ? 'text-yellow-400/80' : 'text-primary/60'} ${fontSize === 1 ? 'text-lg md:text-xl' : fontSize === 1.2 ? 'text-xl md:text-2xl' : 'text-2xl md:text-3xl'}`}
              >
                {t.heroSub}
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="mt-12 flex flex-col gap-4 sm:flex-row sm:gap-6"
              >
                <Link
                  to="/auth"
                  className={`flex items-center justify-center gap-2 rounded transition-all ${highContrast ? 'bg-yellow-400 text-black' : 'bg-primary text-white shadow-2xl'} px-10 py-5 text-lg font-black hover:scale-105`}
                >
                  {t.ctaDashboard}
                  <Activity className="h-5 w-5" />
                </Link>
                <button className={`flex items-center justify-center gap-2 rounded border-2 transition-all ${highContrast ? 'border-yellow-400 text-yellow-400 hover:bg-yellow-400 hover:text-black' : 'border-primary text-primary hover:bg-primary hover:text-white'} px-10 py-5 text-lg font-black`}>
                  {t.ctaNetwork}
                  <Globe className="h-5 w-5" />
                </button>
              </motion.div>
            </div>

            <motion.div
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="hidden lg:block relative"
            >
              <div className={`absolute inset-0 blur-3xl opacity-20 rounded-full ${highContrast ? 'bg-yellow-400' : 'bg-primary'}`} />
              <div className="relative z-10 w-full max-w-xl mx-auto h-[500px]">
                <DotLottieReact
                  src="https://lottie.host/dbc2da71-add2-4b62-9cc4-ebcabd4d4095/HPtjf3J3Tu.lottie"
                  loop
                  autoplay
                />
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* SERVICES */}
      <section id="services" className="py-32">
        <div className="container">
          <div className="mb-20 text-center">
            <h2 className={`text-xs font-black uppercase tracking-[0.3em] transition-colors ${highContrast ? 'text-yellow-400/60' : 'text-primary/60'}`}>{t.servicesTag}</h2>
            <p className={`mt-4 font-black tracking-tight transition-all ${highContrast ? 'text-yellow-400 underline underline-offset-4' : 'text-primary'} ${fontSize === 1 ? 'text-4xl md:text-5xl' : 'text-5xl md:text-6xl'}`}>
              {t.servicesTitle}
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
            {servicesList.map((service, i) => (
              <motion.div
                key={service.title.en}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className={`group p-8 border-2 transition-all ${highContrast ? 'bg-black border-yellow-400' : 'bg-white border-primary/10 hover:border-primary'}`}
              >
                <div className={`mb-6 flex h-14 w-14 items-center justify-center rounded transition-all ${highContrast ? 'bg-yellow-400 text-black' : 'bg-primary/5 text-primary group-hover:bg-primary group-hover:text-white'}`}>
                  <service.icon className="h-7 w-7" />
                </div>
                <h3 className={`mb-4 text-sm font-black tracking-widest transition-colors ${highContrast ? 'text-yellow-400' : 'text-primary'}`}>{service.title[lang as keyof typeof service.title] || service.title.en}</h3>
                <p className={`text-[10px] font-bold leading-relaxed transition-colors ${highContrast ? 'text-yellow-400/80' : 'text-primary/40'}`}>
                  {service.description[lang as keyof typeof service.description] || service.description.en}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA SECTION */}
      <section className="container py-20 pb-40">
        <div className={`relative overflow-hidden rounded-[3rem] p-12 text-center md:p-24 transition-all ${highContrast ? 'bg-yellow-400 text-black' : 'bg-primary text-white'}`}>
          <div className={`absolute inset-0 transition-opacity ${highContrast ? 'bg-transparent' : 'bg-gradient-to-br from-primary/30 to-transparent'}`} />
          <div className="relative z-10 flex flex-col items-center">
            <div className={`mb-8 flex h-20 w-20 items-center justify-center rounded-3xl transition-all ${highContrast ? 'bg-black text-yellow-400' : 'bg-white/10 backdrop-blur-md'}`}>
              <Lock className="h-10 w-10" />
            </div>
            <h2 className={`max-w-2xl font-black tracking-tight transition-all ${fontSize === 1 ? 'text-4xl md:text-6xl' : 'text-5xl md:text-7xl'}`}>
              {t.secureAccess}
            </h2>
            <p className={`mt-6 max-w-xl font-bold opacity-80 transition-all ${fontSize === 1 ? 'text-lg' : 'text-xl'}`}>
              {t.secureSub}
            </p>
            <Link
              to="/auth"
              className={`mt-12 flex items-center gap-3 rounded-full px-12 py-5 text-xl font-black shadow-2xl transition-all hover:scale-105 ${highContrast ? 'bg-black text-yellow-400' : 'bg-white text-primary'}`}
            >
              {t.enterTerminal}
              <Shield className="h-6 w-6" />
            </Link>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className={`border-t py-16 transition-all ${highContrast ? 'bg-black border-yellow-400 text-yellow-400' : 'bg-white border-border text-primary'}`}>
        <div className="container">
          <div className="grid gap-12 lg:grid-cols-3">
            <div className="flex flex-col gap-6">
              <div className="flex items-center gap-4">
                <img src={traffiqLogo} alt="Logo" className="h-12 w-auto object-contain" />
                <span className={`text-2xl font-black tracking-tighter transition-colors ${highContrast ? 'text-yellow-400' : 'text-primary'}`}>TRAFFIQ</span>
              </div>
              <p className={`text-sm leading-relaxed max-w-sm transition-colors ${highContrast ? 'text-yellow-400/60' : 'text-primary/60'}`}>
                {t.footerMission}
              </p>
            </div>
            
            <div className="grid grid-cols-2 gap-8 lg:col-span-2">
              <div className="flex flex-col gap-4">
                <h4 className="font-bold">{t.quickLinks}</h4>
                <div className={`flex flex-col gap-2 text-sm transition-colors ${highContrast ? 'text-yellow-400/60' : 'text-primary/60'}`}>
                  <a href="#" className="hover:underline hover:text-accent">{t.serviceDir}</a>
                  <a href="#" className="hover:underline hover:text-accent">{t.incidentRep}</a>
                  <a href="#" className="hover:underline hover:text-accent">{t.policyDoc}</a>
                  <a href="#" className="hover:underline hover:text-accent">{t.helpdesk}</a>
                </div>
              </div>
              <div className="flex flex-col gap-4">
                <h4 className="font-bold">{t.missionTag}</h4>
                <p className={`text-sm transition-colors ${highContrast ? 'text-yellow-400/60' : 'text-primary/60'}`}>
                  {t.digitalIndia}
                </p>
              </div>
            </div>
          </div>
          
          <div className={`mt-16 border-t pt-8 flex flex-col items-center justify-between gap-6 md:flex-row transition-colors ${highContrast ? 'border-yellow-400/20' : 'border-border'}`}>
            <div className={`flex items-center gap-4 text-xs font-bold uppercase tracking-widest transition-colors ${highContrast ? 'text-yellow-400/40' : 'text-primary/40'}`}>
              <span>{t.privacy}</span>
              <span>{t.terms}</span>
              <span>{t.audit}</span>
            </div>
            <p className={`text-xs font-medium transition-colors ${highContrast ? 'text-yellow-400/40' : 'text-primary/40'}`}>
              {t.copyright}
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
