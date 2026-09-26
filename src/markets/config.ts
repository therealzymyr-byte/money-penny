export type SessionConfig = { id:string; name:string; emoji:string; timezone:string; open:string; close:string; instruments:string[]; enabled:boolean };
export const marketTimezone = 'America/New_York';
export const sessions: SessionConfig[] = [
  {id:'SYDNEY',name:'Sydney',emoji:'🇦🇺',timezone:'Australia/Sydney',open:'08:00',close:'17:00',instruments:['AUD','NZD','AUDUSD'],enabled:true},
  {id:'TOKYO',name:'Tokyo',emoji:'🇯🇵',timezone:'Asia/Tokyo',open:'09:00',close:'18:00',instruments:['JPY','USDJPY','EURJPY','GBPJPY'],enabled:true},
  {id:'LONDON',name:'London',emoji:'🇬🇧',timezone:'Europe/London',open:'08:00',close:'17:00',instruments:['GBP','EUR','CHF','EURUSD','GBPUSD'],enabled:true},
  {id:'NEW_YORK',name:'New York',emoji:'🇺🇸',timezone:'America/New_York',open:'08:00',close:'17:00',instruments:['USD','USDCAD','USDCHF','XAUUSD','XAGUSD'],enabled:true},
];

export const instruments: Record<string,{label:string; emoji:string; sessions:string[]; warning?:string}> = {
  EURUSD:{label:'EUR/USD',emoji:'💱',sessions:['LONDON','NEW_YORK','TOKYO']}, GBPUSD:{label:'GBP/USD',emoji:'💱',sessions:['LONDON','NEW_YORK']}, USDJPY:{label:'USD/JPY',emoji:'💱',sessions:['TOKYO','LONDON','NEW_YORK']}, AUDUSD:{label:'AUD/USD',emoji:'💱',sessions:['SYDNEY','TOKYO','NEW_YORK']}, USDCAD:{label:'USD/CAD',emoji:'💱',sessions:['NEW_YORK']}, USDCHF:{label:'USD/CHF',emoji:'💱',sessions:['LONDON','NEW_YORK']}, EURGBP:{label:'EUR/GBP',emoji:'💱',sessions:['LONDON']}, EURJPY:{label:'EUR/JPY',emoji:'💱',sessions:['TOKYO','LONDON']}, GBPJPY:{label:'GBP/JPY',emoji:'💱',sessions:['TOKYO','LONDON']},
  XAUUSD:{label:'XAUUSD',emoji:'🥇',sessions:['LONDON','NEW_YORK'],warning:'Broker/instrument trading hours may differ from general market-session hours.'}, XAGUSD:{label:'XAGUSD',emoji:'🥈',sessions:['LONDON','NEW_YORK'],warning:'Broker/instrument trading hours may differ from general market-session hours.'}, BTCUSD:{label:'BTCUSD',emoji:'₿',sessions:[],warning:'Crypto trades continuously on many venues; broker/instrument hours may differ.'},
};
