/**
 * Mock 통화 데이터 Seed 스크립트
 *
 * 500건의 현실적인 금융 콜센터 통화 데이터 생성
 * - 다양한 시나리오: 정상통화, 불완전판매, 욕설, 에스컬레이션 등
 * - 전사 텍스트 포함 (한국어)
 */

import type {
  Call,
  Transcript,
  TranscriptSegment,
  Agent,
  Customer,
  Product,
  CallChannel,
  AcwMethod,
  CallStatus,
  CustomerSegment,
  EmploymentType,
  ProductCategory,
} from '../../ontology/src/types';

// ── 설정 ──────────────────────────────────────────────────────

const SEED_COUNT = 500;
const START_DATE = new Date('2026-03-01');
const END_DATE = new Date('2026-03-26');

// ── 시나리오 템플릿 ──────────────────────────────────────────────

interface ScenarioTemplate {
  name: string;
  probability: number;  // 발생 확률 (합계 = 1.0)
  queue: string;
  intent: string;
  segments: TranscriptSegment[];
  hasAbuse: boolean;
  isIncompleteSale: boolean;
  sentiment: 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE';
}

const SCENARIOS: ScenarioTemplate[] = [
  {
    name: '카드분실신고_정상',
    probability: 0.15,
    queue: '카드분실',
    intent: 'CARD_LOST_REPORT',
    hasAbuse: false,
    isIncompleteSale: false,
    sentiment: 'NEUTRAL',
    segments: [
      { index: 0, speaker: 'AGENT', text: '안녕하세요, KB국민은행 카드상담팀 김하나입니다. 무엇을 도와드릴까요?', start_ms: 0, end_ms: 4000, confidence: 0.95 },
      { index: 1, speaker: 'CUSTOMER', text: '네, 카드를 분실한 것 같아서 전화했습니다. 정지시켜 주세요.', start_ms: 4500, end_ms: 8000, confidence: 0.93 },
      { index: 2, speaker: 'AGENT', text: '네, 먼저 본인확인을 위해 성함과 생년월일을 말씀해 주시겠어요?', start_ms: 8500, end_ms: 12000, confidence: 0.96 },
      { index: 3, speaker: 'CUSTOMER', text: '홍길동이고요, 1985년 3월 15일입니다.', start_ms: 12500, end_ms: 15000, confidence: 0.94 },
      { index: 4, speaker: 'AGENT', text: '확인되었습니다. 분실하신 카드가 KB국민카드 포인트리 맞으신가요?', start_ms: 15500, end_ms: 19000, confidence: 0.95 },
      { index: 5, speaker: 'CUSTOMER', text: '네 맞습니다.', start_ms: 19500, end_ms: 20500, confidence: 0.97 },
      { index: 6, speaker: 'AGENT', text: '해당 카드 즉시 정지 처리하겠습니다. 재발급도 함께 진행해 드릴까요?', start_ms: 21000, end_ms: 25000, confidence: 0.96 },
      { index: 7, speaker: 'CUSTOMER', text: '네, 재발급 부탁드립니다.', start_ms: 25500, end_ms: 27000, confidence: 0.95 },
      { index: 8, speaker: 'AGENT', text: '카드 정지 및 재발급 접수 완료되었습니다. 약 7영업일 후 등록 주소로 배송됩니다. 부정사용 내역은 자동으로 모니터링됩니다.', start_ms: 27500, end_ms: 34000, confidence: 0.94 },
      { index: 9, speaker: 'CUSTOMER', text: '감사합니다.', start_ms: 34500, end_ms: 35500, confidence: 0.98 },
      { index: 10, speaker: 'AGENT', text: '다른 문의사항 있으신가요?', start_ms: 36000, end_ms: 37500, confidence: 0.97 },
      { index: 11, speaker: 'CUSTOMER', text: '아니요, 감사합니다.', start_ms: 38000, end_ms: 39000, confidence: 0.98 },
      { index: 12, speaker: 'AGENT', text: 'KB국민은행 김하나였습니다. 좋은 하루 되세요.', start_ms: 39500, end_ms: 42000, confidence: 0.96 },
    ],
  },
  {
    name: '대출상담_정상',
    probability: 0.12,
    queue: '대출상담',
    intent: 'LOAN_INQUIRY',
    hasAbuse: false,
    isIncompleteSale: false,
    sentiment: 'NEUTRAL',
    segments: [
      { index: 0, speaker: 'AGENT', text: '안녕하세요, KB국민은행 대출상담팀 박민수입니다.', start_ms: 0, end_ms: 3000, confidence: 0.95 },
      { index: 1, speaker: 'CUSTOMER', text: '주택담보대출 금리가 어떻게 되는지 문의드립니다.', start_ms: 3500, end_ms: 6500, confidence: 0.93 },
      { index: 2, speaker: 'AGENT', text: '네, 현재 KB주택담보대출 기준금리는 연 3.5%에서 5.2% 사이입니다. 고객님의 신용등급과 LTV에 따라 달라집니다.', start_ms: 7000, end_ms: 14000, confidence: 0.94 },
      { index: 3, speaker: 'CUSTOMER', text: '제가 신용등급이 2등급이고 아파트 시세가 8억인데 5억 정도 대출 가능한가요?', start_ms: 14500, end_ms: 19000, confidence: 0.92 },
      { index: 4, speaker: 'AGENT', text: 'LTV 62.5%로 규제 범위 내입니다. 신용 2등급이시면 우대금리 적용 가능하시고, 예상 금리는 연 3.8% 내외입니다.', start_ms: 19500, end_ms: 27000, confidence: 0.93 },
      { index: 5, speaker: 'CUSTOMER', text: '중도상환수수료는 어떻게 되나요?', start_ms: 27500, end_ms: 30000, confidence: 0.95 },
      { index: 6, speaker: 'AGENT', text: '3년 이내 중도상환 시 잔여 원금의 1.4%입니다. 3년 이후에는 수수료가 없습니다.', start_ms: 30500, end_ms: 36000, confidence: 0.94 },
      { index: 7, speaker: 'CUSTOMER', text: '알겠습니다. 좀 더 생각해보고 연락드리겠습니다.', start_ms: 36500, end_ms: 39500, confidence: 0.96 },
      { index: 8, speaker: 'AGENT', text: '네, 필요한 서류는 신분증, 재직증명서, 소득증빙서류입니다. 준비하시고 연락 주시면 바로 진행 도와드리겠습니다.', start_ms: 40000, end_ms: 47000, confidence: 0.93 },
      { index: 9, speaker: 'AGENT', text: '다른 문의사항 있으신가요?', start_ms: 47500, end_ms: 49000, confidence: 0.97 },
      { index: 10, speaker: 'CUSTOMER', text: '없습니다. 감사합니다.', start_ms: 49500, end_ms: 51000, confidence: 0.98 },
      { index: 11, speaker: 'AGENT', text: 'KB국민은행 박민수였습니다. 좋은 하루 되세요.', start_ms: 51500, end_ms: 54000, confidence: 0.96 },
    ],
  },
  {
    name: '고객욕설_감정노동',
    probability: 0.08,
    queue: '카드결제',
    intent: 'CARD_PAYMENT_INQUIRY',
    hasAbuse: true,
    isIncompleteSale: false,
    sentiment: 'NEGATIVE',
    segments: [
      { index: 0, speaker: 'AGENT', text: '안녕하세요, KB국민은행 카드상담팀입니다.', start_ms: 0, end_ms: 3000, confidence: 0.95 },
      { index: 1, speaker: 'CUSTOMER', text: '야, 내 카드가 왜 안 되는 거야! 아까부터 결제가 안 된다고!', start_ms: 3500, end_ms: 7000, confidence: 0.91 },
      { index: 2, speaker: 'AGENT', text: '불편을 드려 죄송합니다. 확인해 드리겠습니다. 카드번호 뒷자리를 알려주시겠어요?', start_ms: 7500, end_ms: 12000, confidence: 0.94 },
      { index: 3, speaker: 'CUSTOMER', text: '5678이야. 빨리 좀 해줘!', start_ms: 12500, end_ms: 14500, confidence: 0.92 },
      { index: 4, speaker: 'AGENT', text: '확인 중입니다. 잠시만 기다려 주세요.', start_ms: 15000, end_ms: 17000, confidence: 0.96 },
      { index: 5, speaker: 'CUSTOMER', text: '대체 뭘 확인하는 거야? 은행이 일을 이따위로 해?', start_ms: 17500, end_ms: 20500, confidence: 0.90 },
      { index: 6, speaker: 'AGENT', text: '확인되었습니다. 고객님 카드의 일시불 한도가 초과된 상태입니다. 이번 달 결제 예정액이 한도의 90%를 초과하셨습니다.', start_ms: 21000, end_ms: 28000, confidence: 0.93 },
      { index: 7, speaker: 'CUSTOMER', text: '그럼 한도를 올려달라고! 이런 개같은 서비스가 어딨어!', start_ms: 28500, end_ms: 32000, confidence: 0.89 },
      { index: 8, speaker: 'AGENT', text: '고객님, 감정이 격해지신 것은 이해하지만, 원활한 상담을 위해 차분한 대화 부탁드립니다.', start_ms: 32500, end_ms: 37000, confidence: 0.94 },
      { index: 9, speaker: 'CUSTOMER', text: '차분하라고? 니네 때문에 창피당했는데! 고소할 거야!', start_ms: 37500, end_ms: 41000, confidence: 0.88 },
      { index: 10, speaker: 'AGENT', text: '임시 한도 상향 신청을 도와드리겠습니다. 소득증빙서류를 제출해 주시면 영업일 기준 1~2일 내에 검토됩니다.', start_ms: 41500, end_ms: 48000, confidence: 0.93 },
      { index: 11, speaker: 'CUSTOMER', text: '그거밖에 안 되냐고. 알겠어. 끊어.', start_ms: 48500, end_ms: 51000, confidence: 0.91 },
    ],
  },
  {
    name: '펀드가입_불완전판매의심',
    probability: 0.06,
    queue: '투자상담',
    intent: 'FUND_NEW',
    hasAbuse: false,
    isIncompleteSale: true,
    sentiment: 'NEUTRAL',
    segments: [
      { index: 0, speaker: 'AGENT', text: '안녕하세요, KB국민은행 투자상담팀 이지은입니다.', start_ms: 0, end_ms: 3500, confidence: 0.95 },
      { index: 1, speaker: 'CUSTOMER', text: '요즘 좋은 펀드 있으면 추천해 주세요. 은행 금리가 너무 낮아서요.', start_ms: 4000, end_ms: 8000, confidence: 0.93 },
      { index: 2, speaker: 'AGENT', text: '네, 현재 KB글로벌테크펀드가 최근 6개월 수익률 12%로 인기가 많습니다.', start_ms: 8500, end_ms: 13000, confidence: 0.94 },
      { index: 3, speaker: 'CUSTOMER', text: '12%요? 예금보다 훨씬 좋네요. 그 정도면 거의 확실한 건가요?', start_ms: 13500, end_ms: 17000, confidence: 0.92 },
      { index: 4, speaker: 'AGENT', text: '네, 이 펀드는 글로벌 기술주에 투자하는 거라 추세가 좋습니다. 연 7% 정도 수익을 기대하실 수 있습니다.', start_ms: 17500, end_ms: 23000, confidence: 0.93 },
      { index: 5, speaker: 'CUSTOMER', text: '원금은 다 보장되는 거죠?', start_ms: 23500, end_ms: 25500, confidence: 0.95 },
      { index: 6, speaker: 'AGENT', text: '네, 거의 그렇게 보시면 됩니다. 장기 투자하시면 안전합니다.', start_ms: 26000, end_ms: 30000, confidence: 0.92 },
      { index: 7, speaker: 'CUSTOMER', text: '잘 모르겠지만 좋다고 하시니 가입할게요. 500만원이요.', start_ms: 30500, end_ms: 34000, confidence: 0.91 },
      { index: 8, speaker: 'AGENT', text: '네, 500만원 KB글로벌테크펀드 가입 접수하겠습니다.', start_ms: 34500, end_ms: 38000, confidence: 0.94 },
      { index: 9, speaker: 'CUSTOMER', text: '감사합니다.', start_ms: 38500, end_ms: 39500, confidence: 0.98 },
      { index: 10, speaker: 'AGENT', text: 'KB국민은행 이지은이었습니다.', start_ms: 40000, end_ms: 42000, confidence: 0.96 },
    ],
  },
  {
    name: '잔액조회_간단',
    probability: 0.18,
    queue: '계좌서비스',
    intent: 'DEPOSIT_BALANCE',
    hasAbuse: false,
    isIncompleteSale: false,
    sentiment: 'POSITIVE',
    segments: [
      { index: 0, speaker: 'AGENT', text: '안녕하세요, KB국민은행입니다. 무엇을 도와드릴까요?', start_ms: 0, end_ms: 3000, confidence: 0.96 },
      { index: 1, speaker: 'CUSTOMER', text: '제 통장 잔액 좀 확인해 주세요.', start_ms: 3500, end_ms: 5500, confidence: 0.95 },
      { index: 2, speaker: 'AGENT', text: '본인확인 후 안내드리겠습니다. 성함과 계좌번호 뒷자리를 말씀해 주세요.', start_ms: 6000, end_ms: 10000, confidence: 0.96 },
      { index: 3, speaker: 'CUSTOMER', text: '김영희이고, 뒷자리는 1234입니다.', start_ms: 10500, end_ms: 13000, confidence: 0.94 },
      { index: 4, speaker: 'AGENT', text: '확인되었습니다. 보통예금 계좌 잔액은 2,350,000원입니다.', start_ms: 13500, end_ms: 17000, confidence: 0.95 },
      { index: 5, speaker: 'CUSTOMER', text: '감사합니다. 그게 다예요.', start_ms: 17500, end_ms: 19000, confidence: 0.97 },
      { index: 6, speaker: 'AGENT', text: '감사합니다. 좋은 하루 되세요.', start_ms: 19500, end_ms: 21000, confidence: 0.97 },
    ],
  },
  {
    name: '보험금청구',
    probability: 0.10,
    queue: '보험상담',
    intent: 'INSURANCE_CLAIM',
    hasAbuse: false,
    isIncompleteSale: false,
    sentiment: 'NEUTRAL',
    segments: [
      { index: 0, speaker: 'AGENT', text: '안녕하세요, KB손해보험 보상팀입니다.', start_ms: 0, end_ms: 3000, confidence: 0.95 },
      { index: 1, speaker: 'CUSTOMER', text: '지난주에 교통사고가 났는데 보험금 청구하려고요.', start_ms: 3500, end_ms: 7000, confidence: 0.93 },
      { index: 2, speaker: 'AGENT', text: '먼저 고객님 괜찮으신지 여쭤봅니다. 다치신 곳은 없으신가요?', start_ms: 7500, end_ms: 11000, confidence: 0.94 },
      { index: 3, speaker: 'CUSTOMER', text: '다행히 경미한 접촉사고였어요. 차량 수리비만 청구하고 싶습니다.', start_ms: 11500, end_ms: 15000, confidence: 0.92 },
      { index: 4, speaker: 'AGENT', text: '다행이네요. 사고 접수 도와드리겠습니다. 사고 일시와 장소를 말씀해 주세요.', start_ms: 15500, end_ms: 20000, confidence: 0.94 },
      { index: 5, speaker: 'CUSTOMER', text: '3월 20일 오후 3시쯤이고, 강남역 교차로에서 있었습니다.', start_ms: 20500, end_ms: 24000, confidence: 0.93 },
      { index: 6, speaker: 'AGENT', text: '접수되었습니다. 사고 사진, 수리견적서, 사고확인서를 앱으로 제출해 주시면 3영업일 내에 심사 결과를 안내드립니다.', start_ms: 24500, end_ms: 32000, confidence: 0.93 },
      { index: 7, speaker: 'CUSTOMER', text: '앱으로 어떻게 제출하나요?', start_ms: 32500, end_ms: 34500, confidence: 0.95 },
      { index: 8, speaker: 'AGENT', text: 'KB손해보험 앱에서 보험금청구 메뉴로 들어가시면 사진 첨부가 가능합니다. 접수번호는 CLM-20260320-001입니다.', start_ms: 35000, end_ms: 42000, confidence: 0.93 },
      { index: 9, speaker: 'CUSTOMER', text: '알겠습니다. 감사합니다.', start_ms: 42500, end_ms: 44000, confidence: 0.97 },
      { index: 10, speaker: 'AGENT', text: '다른 문의사항 있으신가요? 없으시다면 좋은 하루 되세요.', start_ms: 44500, end_ms: 47000, confidence: 0.96 },
    ],
  },
  {
    name: '이체문의_에스컬레이션',
    probability: 0.07,
    queue: '계좌서비스',
    intent: 'DEPOSIT_TRANSFER',
    hasAbuse: false,
    isIncompleteSale: false,
    sentiment: 'NEGATIVE',
    segments: [
      { index: 0, speaker: 'AGENT', text: '안녕하세요, KB국민은행입니다.', start_ms: 0, end_ms: 2500, confidence: 0.96 },
      { index: 1, speaker: 'CUSTOMER', text: '이체한 돈이 안 들어갔다고 하는데 확인 좀 해주세요. 어제 500만원 이체했거든요.', start_ms: 3000, end_ms: 8000, confidence: 0.92 },
      { index: 2, speaker: 'AGENT', text: '본인확인 후 확인해 드리겠습니다. 성함과 계좌번호를 말씀해 주세요.', start_ms: 8500, end_ms: 12000, confidence: 0.95 },
      { index: 3, speaker: 'CUSTOMER', text: '박진우이고, 보내는 계좌 뒷자리는 5678입니다.', start_ms: 12500, end_ms: 15500, confidence: 0.93 },
      { index: 4, speaker: 'AGENT', text: '확인했습니다. 어제 17시 32분에 500만원 이체 기록이 있습니다. 받는 분 은행이 어디신가요?', start_ms: 16000, end_ms: 22000, confidence: 0.94 },
      { index: 5, speaker: 'CUSTOMER', text: '하나은행이에요. 상대방이 아직 안 들어왔다고 하는데요.', start_ms: 22500, end_ms: 26000, confidence: 0.93 },
      { index: 6, speaker: 'AGENT', text: '타행이체 지연이 발생한 것으로 보입니다. 이 건은 전산팀 확인이 필요하여 담당 부서로 이관해 드리겠습니다.', start_ms: 26500, end_ms: 33000, confidence: 0.93 },
      { index: 7, speaker: 'CUSTOMER', text: '언제까지 해결되나요? 급한 돈인데...', start_ms: 33500, end_ms: 36000, confidence: 0.91 },
      { index: 8, speaker: 'AGENT', text: '금일 중으로 확인 후 콜백 드리겠습니다. 연락받으실 번호를 확인해 주세요.', start_ms: 36500, end_ms: 41000, confidence: 0.94 },
      { index: 9, speaker: 'CUSTOMER', text: '010-1234-5678입니다. 오늘 안에 꼭 연락 주세요.', start_ms: 41500, end_ms: 45000, confidence: 0.93 },
      { index: 10, speaker: 'AGENT', text: '네, 금일 중 반드시 안내드리겠습니다. 불편 드려 죄송합니다.', start_ms: 45500, end_ms: 49000, confidence: 0.95 },
    ],
  },
  {
    name: '앱장애_디지털',
    probability: 0.08,
    queue: '디지털상담',
    intent: 'DIGITAL_APP_ISSUE',
    hasAbuse: false,
    isIncompleteSale: false,
    sentiment: 'NEGATIVE',
    segments: [
      { index: 0, speaker: 'AGENT', text: '안녕하세요, KB국민은행 디지털상담팀입니다.', start_ms: 0, end_ms: 3000, confidence: 0.95 },
      { index: 1, speaker: 'CUSTOMER', text: 'KB스타뱅킹 앱이 아까부터 로그인이 안 돼요.', start_ms: 3500, end_ms: 6500, confidence: 0.93 },
      { index: 2, speaker: 'AGENT', text: '불편을 드려 죄송합니다. 어떤 오류 메시지가 나타나시나요?', start_ms: 7000, end_ms: 10500, confidence: 0.94 },
      { index: 3, speaker: 'CUSTOMER', text: '서버 오류라고 뜹니다. 코드는 E-5001이에요.', start_ms: 11000, end_ms: 14000, confidence: 0.92 },
      { index: 4, speaker: 'AGENT', text: 'E-5001은 서버 점검 관련 오류입니다. 현재 일부 서비스 점검이 진행 중인 것으로 확인됩니다. 약 30분 후 다시 시도해 주시겠어요?', start_ms: 14500, end_ms: 22000, confidence: 0.93 },
      { index: 5, speaker: 'CUSTOMER', text: '급한 이체가 있는데 전화로 할 수 있나요?', start_ms: 22500, end_ms: 25500, confidence: 0.94 },
      { index: 6, speaker: 'AGENT', text: '네, 전화 이체 도와드리겠습니다.', start_ms: 26000, end_ms: 28000, confidence: 0.96 },
    ],
  },
  {
    name: '연체상담',
    probability: 0.06,
    queue: '여신관리',
    intent: 'LOAN_OVERDUE',
    hasAbuse: false,
    isIncompleteSale: false,
    sentiment: 'NEGATIVE',
    segments: [
      { index: 0, speaker: 'AGENT', text: '안녕하세요, KB국민은행 여신관리팀입니다.', start_ms: 0, end_ms: 3000, confidence: 0.95 },
      { index: 1, speaker: 'CUSTOMER', text: '이번 달 대출 이자를 못 냈는데 어떻게 해야 하나요?', start_ms: 3500, end_ms: 7000, confidence: 0.93 },
      { index: 2, speaker: 'AGENT', text: '먼저 상황을 이해합니다. 일시적인 어려움이신가요, 아니면 장기적으로 상환이 어려우신 상황인가요?', start_ms: 7500, end_ms: 13000, confidence: 0.94 },
      { index: 3, speaker: 'CUSTOMER', text: '회사가 구조조정을 해서... 다음 달에는 낼 수 있을 것 같은데요.', start_ms: 13500, end_ms: 18000, confidence: 0.91 },
      { index: 4, speaker: 'AGENT', text: '유예 제도를 안내드리겠습니다. 1개월 이자 유예가 가능하며, 연체 이자는 별도로 부과됩니다.', start_ms: 18500, end_ms: 25000, confidence: 0.93 },
      { index: 5, speaker: 'CUSTOMER', text: '연체 이자는 얼마인가요?', start_ms: 25500, end_ms: 27500, confidence: 0.94 },
      { index: 6, speaker: 'AGENT', text: '연체 금액에 대해 연 3%의 연체 이자가 적용됩니다. 이달 이자 45만원 기준으로 약 1,125원입니다.', start_ms: 28000, end_ms: 35000, confidence: 0.93 },
      { index: 7, speaker: 'CUSTOMER', text: '유예 신청하겠습니다.', start_ms: 35500, end_ms: 37000, confidence: 0.96 },
      { index: 8, speaker: 'AGENT', text: '1개월 이자 유예 신청 접수되었습니다. 다음 달 25일까지 이번 달 이자를 포함하여 납부해 주시면 됩니다.', start_ms: 37500, end_ms: 44000, confidence: 0.94 },
    ],
  },
  {
    name: '환전문의',
    probability: 0.05,
    queue: '외환상담',
    intent: 'FOREX_EXCHANGE',
    hasAbuse: false,
    isIncompleteSale: false,
    sentiment: 'POSITIVE',
    segments: [
      { index: 0, speaker: 'AGENT', text: '안녕하세요, KB국민은행 외환상담입니다.', start_ms: 0, end_ms: 3000, confidence: 0.95 },
      { index: 1, speaker: 'CUSTOMER', text: '다음 주에 일본 출장인데 엔화 환전하려고요.', start_ms: 3500, end_ms: 6500, confidence: 0.94 },
      { index: 2, speaker: 'AGENT', text: '현재 엔화 매매기준율은 100엔당 897원이고, 스프레드 적용 시 917원 정도입니다.', start_ms: 7000, end_ms: 13000, confidence: 0.93 },
      { index: 3, speaker: 'CUSTOMER', text: '50만엔 정도 환전하고 싶은데요.', start_ms: 13500, end_ms: 15500, confidence: 0.95 },
      { index: 4, speaker: 'AGENT', text: '50만엔 기준 약 458만5천원입니다. KB스타뱅킹 앱으로 환전하시면 환율 우대 70%를 받으실 수 있습니다.', start_ms: 16000, end_ms: 23000, confidence: 0.93 },
      { index: 5, speaker: 'CUSTOMER', text: '앱으로 하면 더 싸군요. 그렇게 할게요. 감사합니다.', start_ms: 23500, end_ms: 27000, confidence: 0.95 },
      { index: 6, speaker: 'AGENT', text: '네, 환전 후 가까운 영업점에서 수령하시면 됩니다. 좋은 출장 되세요!', start_ms: 27500, end_ms: 31000, confidence: 0.96 },
    ],
  },
  {
    name: '비밀번호재설정',
    probability: 0.05,
    queue: '디지털상담',
    intent: 'DIGITAL_PASSWORD_RESET',
    hasAbuse: false,
    isIncompleteSale: false,
    sentiment: 'NEUTRAL',
    segments: [
      { index: 0, speaker: 'AGENT', text: '안녕하세요, KB국민은행 디지털상담팀입니다.', start_ms: 0, end_ms: 3000, confidence: 0.95 },
      { index: 1, speaker: 'CUSTOMER', text: '인터넷뱅킹 비밀번호를 까먹었는데 재설정하고 싶습니다.', start_ms: 3500, end_ms: 7000, confidence: 0.94 },
      { index: 2, speaker: 'AGENT', text: '본인확인 절차를 진행하겠습니다. 주민등록번호 앞 6자리와 이름을 말씀해 주세요.', start_ms: 7500, end_ms: 12000, confidence: 0.95 },
      { index: 3, speaker: 'CUSTOMER', text: '850315, 이수진입니다.', start_ms: 12500, end_ms: 14500, confidence: 0.94 },
      { index: 4, speaker: 'AGENT', text: '확인되었습니다. 등록된 휴대폰으로 인증번호를 발송해 드리겠습니다.', start_ms: 15000, end_ms: 19000, confidence: 0.96 },
      { index: 5, speaker: 'CUSTOMER', text: '인증번호 왔습니다. 482917이에요.', start_ms: 25000, end_ms: 28000, confidence: 0.93 },
      { index: 6, speaker: 'AGENT', text: '인증 완료되었습니다. 새 비밀번호를 설정해 주세요. 영문+숫자+특수문자 조합 8자리 이상이어야 합니다.', start_ms: 28500, end_ms: 34000, confidence: 0.95 },
      { index: 7, speaker: 'CUSTOMER', text: '설정했습니다.', start_ms: 40000, end_ms: 41000, confidence: 0.97 },
      { index: 8, speaker: 'AGENT', text: '비밀번호 재설정이 완료되었습니다. 다른 문의사항 있으신가요?', start_ms: 41500, end_ms: 44500, confidence: 0.96 },
    ],
  },
];

// ── ID 생성 유틸리티 ──────────────────────────────────────────

function generateId(prefix: string, index: number): string {
  const date = randomDate(START_DATE, END_DATE);
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
  const timeStr = `${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
  return `${prefix}-${dateStr}-${timeStr}-${String(index).padStart(3, '0')}`;
}

function randomDate(start: Date, end: Date): Date {
  const startTime = start.getTime();
  const endTime = end.getTime();
  const randomTime = startTime + Math.random() * (endTime - startTime);
  const date = new Date(randomTime);
  // 업무 시간: 8시~20시
  date.setHours(8 + Math.floor(Math.random() * 12));
  date.setMinutes(Math.floor(Math.random() * 60));
  date.setSeconds(Math.floor(Math.random() * 60));
  return date;
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function randomChoice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomRange(min: number, max: number): number {
  return min + Math.floor(Math.random() * (max - min + 1));
}

// ── 상담원 시드 데이터 ──────────────────────────────────────────

function generateAgents(count: number): Agent[] {
  const teams = ['카드상담팀', '대출상담팀', '보험상담팀', '디지털상담팀', '외환상담팀', '여신관리팀', '투자상담팀'];
  const skills = ['카드', '대출', '보험', '디지털', '외환', '투자', '예금'];
  const outsourceCompanies = ['KT CS', 'KT IS', 'KTDS', '효성ITX', '유베이스'];
  const names = ['김*나', '박*수', '이*은', '정*호', '최*영', '강*정', '윤*미', '조*현', '한*우', '서*진',
    '임*화', '송*석', '노*빈', '황*아', '전*준', '배*리', '오*태', '홍*동', '문*솔', '양*수'];

  return Array.from({ length: count }, (_, i) => {
    const isOutsourced = Math.random() < 0.683; // 68.3% 간접고용
    return {
      id: `AGENT-${String(i + 1).padStart(3, '0')}`,
      name_masked: names[i % names.length],
      team: randomChoice(teams),
      skill_group: [randomChoice(skills), ...(Math.random() > 0.5 ? [randomChoice(skills)] : [])],
      employment_type: (isOutsourced ? 'OUTSOURCED' : 'DIRECT') as EmploymentType,
      outsource_company: isOutsourced ? randomChoice(outsourceCompanies) : undefined,
      tenure_months: randomRange(3, 120),
      avg_acw_seconds: randomRange(60, 180),
      avg_handle_time: randomRange(180, 420),
      csat_score: Math.round((3.0 + Math.random() * 2.0) * 10) / 10,
      emotional_labor_score: Math.round(Math.random() * 100) / 100,
      created_at: new Date().toISOString(),
    };
  });
}

// ── 고객 시드 데이터 ──────────────────────────────────────────

function generateCustomers(count: number): Customer[] {
  const segments: CustomerSegment[] = ['VIP', 'PREMIUM', 'GENERAL', 'NEW', 'DORMANT'];
  const segmentWeights = [0.05, 0.15, 0.55, 0.15, 0.10];
  const products = ['KB국민카드', 'KB주택담보대출', 'KB정기예금', 'KB손해보험', 'KB글로벌펀드', 'KB연금저축'];
  const names = ['홍*동', '김*수', '이*라', '박*우', '정*아', '최*현', '강*빈', '윤*진', '조*민', '한*서'];

  return Array.from({ length: count }, (_, i) => {
    // 가중치 기반 세그먼트 선택
    let rand = Math.random();
    let segIndex = 0;
    for (let j = 0; j < segmentWeights.length; j++) {
      rand -= segmentWeights[j];
      if (rand <= 0) { segIndex = j; break; }
    }

    const productCount = randomRange(1, 4);
    const customerProducts = Array.from({ length: productCount }, () => randomChoice(products));

    return {
      id: `CUST-${String(i + 1).padStart(5, '0')}`,
      name_masked: names[i % names.length],
      segment: segments[segIndex],
      products: [...new Set(customerProducts)],
      risk_grade: randomChoice(['A', 'A+', 'B', 'B+', 'C']),
      total_calls_30d: randomRange(0, 5),
      last_call_date: randomDate(START_DATE, END_DATE).toISOString().slice(0, 10),
      created_at: new Date().toISOString(),
    };
  });
}

// ── 금융 상품 시드 데이터 ────────────────────────────────────────

function generateProducts(): Product[] {
  return [
    { id: 'PROD-001', name: 'KB국민카드 포인트리', category: 'CARD', sub_category: '신용카드', status: 'ACTIVE' },
    { id: 'PROD-002', name: 'KB국민카드 탄탄대로', category: 'CARD', sub_category: '체크카드', status: 'ACTIVE' },
    { id: 'PROD-003', name: 'KB주택담보대출', category: 'LOAN', sub_category: '담보대출', status: 'ACTIVE' },
    { id: 'PROD-004', name: 'KB신용대출', category: 'LOAN', sub_category: '신용대출', status: 'ACTIVE' },
    { id: 'PROD-005', name: 'KB정기예금', category: 'DEPOSIT', sub_category: '정기예금', status: 'ACTIVE' },
    { id: 'PROD-006', name: 'KB보통예금', category: 'DEPOSIT', sub_category: '보통예금', status: 'ACTIVE' },
    { id: 'PROD-007', name: 'KB손해보험 자동차', category: 'INSURANCE', sub_category: '자동차보험', status: 'ACTIVE' },
    { id: 'PROD-008', name: 'KB글로벌테크펀드', category: 'FUND', sub_category: '해외주식형', status: 'ACTIVE' },
    { id: 'PROD-009', name: 'KB연금저축펀드', category: 'PENSION', sub_category: '연금저축', status: 'ACTIVE' },
    { id: 'PROD-010', name: 'KB외화정기예금', category: 'FOREX', sub_category: '외화예금', status: 'ACTIVE' },
  ];
}

// ── 통화 + 전사 텍스트 시드 데이터 ──────────────────────────────

function selectScenario(): ScenarioTemplate {
  let rand = Math.random();
  for (const scenario of SCENARIOS) {
    rand -= scenario.probability;
    if (rand <= 0) return scenario;
  }
  return SCENARIOS[0]; // fallback
}

function generateCallsAndTranscripts(count: number, agents: Agent[], customers: Customer[]) {
  const calls: Call[] = [];
  const transcripts: Transcript[] = [];

  for (let i = 0; i < count; i++) {
    const scenario = selectScenario();
    const callDate = randomDate(START_DATE, END_DATE);
    const callId = generateId('CALL', i + 1);
    const transcriptId = `TSCR-${callId.slice(5)}`;
    const agent = randomChoice(agents);
    const customer = randomChoice(customers);

    // 통화 시간 = 세그먼트의 마지막 end_ms
    const lastSegment = scenario.segments[scenario.segments.length - 1];
    const durationMs = lastSegment.end_ms + randomRange(1000, 5000);
    const durationSeconds = Math.floor(durationMs / 1000);

    // ACW 시간: AI 자동이면 5~15초, 수동이면 60~180초
    const acwMethod: AcwMethod = Math.random() < 0.6 ? 'AI_AUTO' : 'MANUAL';
    const acwDuration = acwMethod === 'AI_AUTO' ? randomRange(5, 15) : randomRange(60, 180);

    const endTime = new Date(callDate.getTime() + durationMs);
    const acwStartTime = new Date(endTime.getTime() + 1000);
    const acwEndTime = new Date(acwStartTime.getTime() + acwDuration * 1000);

    calls.push({
      id: callId,
      customer_id: customer.id,
      agent_id: agent.id,
      channel: randomChoice(['INBOUND', 'INBOUND', 'INBOUND', 'OUTBOUND'] as CallChannel[]),
      queue: scenario.queue,
      start_time: callDate.toISOString(),
      end_time: endTime.toISOString(),
      duration_seconds: durationSeconds,
      acw_start_time: acwStartTime.toISOString(),
      acw_end_time: acwEndTime.toISOString(),
      acw_duration_seconds: acwDuration,
      acw_method: acwMethod,
      recording_url: `s3://recordings/${callId}.wav`,
      transcript_id: transcriptId,
      status: 'CLOSED' as CallStatus,
      created_at: callDate.toISOString(),
    });

    const fullText = scenario.segments.map((s) => s.text).join(' ');
    transcripts.push({
      id: transcriptId,
      call_id: callId,
      full_text: fullText,
      segments: scenario.segments.map((s) => ({ ...s })),
      stt_engine: 'KT_ACEN_STT',
      stt_confidence: 0.88 + Math.random() * 0.10,
      language: 'ko-KR',
      created_at: callDate.toISOString(),
    });
  }

  return { calls, transcripts };
}

// ── 메인 실행 ───────────────────────────────────────────────

export function generateSeedData() {
  console.log('=== K-Palantir ACW Mock 데이터 생성 시작 ===');
  console.log(`통화 건수: ${SEED_COUNT}`);
  console.log(`기간: ${START_DATE.toISOString().slice(0, 10)} ~ ${END_DATE.toISOString().slice(0, 10)}`);

  const agents = generateAgents(20);
  console.log(`상담원: ${agents.length}명 (직접고용 ${agents.filter((a) => a.employment_type === 'DIRECT').length}, 간접고용 ${agents.filter((a) => a.employment_type === 'OUTSOURCED').length})`);

  const customers = generateCustomers(200);
  console.log(`고객: ${customers.length}명`);

  const products = generateProducts();
  console.log(`상품: ${products.length}개`);

  const { calls, transcripts } = generateCallsAndTranscripts(SEED_COUNT, agents, customers);
  console.log(`통화: ${calls.length}건`);
  console.log(`전사 텍스트: ${transcripts.length}건`);

  // 시나리오별 통계
  const scenarioStats = new Map<string, number>();
  for (const call of calls) {
    const queue = call.queue;
    scenarioStats.set(queue, (scenarioStats.get(queue) || 0) + 1);
  }
  console.log('\n--- 시나리오별 분포 ---');
  for (const [queue, count] of scenarioStats.entries()) {
    console.log(`  ${queue}: ${count}건 (${((count / SEED_COUNT) * 100).toFixed(1)}%)`);
  }

  // ACW 방식별 통계
  const aiAuto = calls.filter((c) => c.acw_method === 'AI_AUTO');
  const manual = calls.filter((c) => c.acw_method === 'MANUAL');
  console.log('\n--- ACW 방식별 통계 ---');
  console.log(`  AI_AUTO: ${aiAuto.length}건, 평균 ${Math.round(aiAuto.reduce((s, c) => s + c.acw_duration_seconds, 0) / aiAuto.length)}초`);
  console.log(`  MANUAL: ${manual.length}건, 평균 ${Math.round(manual.reduce((s, c) => s + c.acw_duration_seconds, 0) / manual.length)}초`);
  console.log(`  예상 절감 시간: ${Math.round(aiAuto.reduce((s, c) => s + (120 - c.acw_duration_seconds), 0) / 3600)}시간`);

  // 고용형태 통계
  console.log('\n--- 고용형태 통계 (노란봉투법 대응) ---');
  console.log(`  직접고용: ${agents.filter((a) => a.employment_type === 'DIRECT').length}명`);
  console.log(`  간접고용: ${agents.filter((a) => a.employment_type === 'OUTSOURCED').length}명 (${((agents.filter((a) => a.employment_type === 'OUTSOURCED').length / agents.length) * 100).toFixed(1)}%)`);

  console.log('\n=== 데이터 생성 완료 ===');

  return { agents, customers, products, calls, transcripts };
}

// CLI 실행
if (require.main === module) {
  const data = generateSeedData();
  // JSON 출력 (파이프로 파일 저장 가능)
  if (process.argv.includes('--json')) {
    console.log(JSON.stringify(data, null, 2));
  }
}

export default generateSeedData;
