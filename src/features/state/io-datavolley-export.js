import { createDomainState } from "../../app/domain-state.mjs";

export const session = createDomainState({
"DEFAULT_DVW_ATTACK_COMBINATIONS": () => ([
  "V5;4;R;H;High set in 4;;255;4912;F;;",
  "V6;2;L;H;High set in 2;;255;4988;B;;",
  "V8;9;C;H;High set in 1;;255;4186;B;1;",
  "VV;7;R;H;Emerg 4 high;;0;3627;F;;",
  "X1;3;R;Q;Quick;;16711680;4956;C;;",
  "X5;4;R;T;Shoot in 4;;16711680;4912;F;;",
  "X6;2;L;T;Shoot in 2;;16711680;4988;B;;",
  "XP;8;C;M;Pipe;;16711680;4150;P;1;",
  "PR;3;C;O;Attack on opponent freeball;;255;4949;-;;",
  "PP;3;L;O;Setter tip;;16711680;4964;S;;",
  "CF;2;L;N;Slide close to setter;;16711680;4976;C;;",
  "CD;2;L;N;Slide away from setter;;16711680;4986;C;;",
  "CB;2;L;N;Slide next to setter;;16711680;4970;C;;"
]),
"DEFAULT_DVW_SETTER_CALLS": () => ([
  "K1;;Front Quick;;16711680;3949;4454;4958;;;",
  "K2;;Back Quick;;16711680;3864;4278;4974;;;",
  "K7;;Seven;;16711680;3923;4426;4930;;;",
  "KC;;Quick in 3;;16711680;3849;4449;5049;;;",
  "KM;;shifted to 2;;16711680;0000;0000;0000;4924,5524,5530,6332,6312,5012,5024,;12632256;",
  "KP;;Shifted to 4;;16711680;0000;0000;0000;5457,5057,5557,5552,6352,6364,5377,5077,5058,5058,;12632256;",
  "KE;;No First Tempo;;0;0000;0000;0000;5858,5826,6426,6458,6458,;12632256;"
]),
"DEFAULT_DVW_WINNING_SYMBOLS": () => (["=~~~#~~~=~~~~~~~=/~~#~~~=/~~#~~~=~~~~~~~=~~~~~~~=~~~~~~~"])
});
const datavolleyExportState = session;
