// An original open kitchen, drawn with flat geometry and warm SVG lighting.
export function kitchen() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 1000" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
    <defs>
      <linearGradient id="kitchen-wall" x2="0" y2="100%"><stop stop-color="#33291f"/><stop offset="1" stop-color="#70513a"/></linearGradient>
      <radialGradient id="kitchen-fire"><stop stop-color="#ffd28a" stop-opacity=".8"/><stop offset=".5" stop-color="#d67835" stop-opacity=".25"/><stop offset="1" stop-color="#d67835" stop-opacity="0"/></radialGradient>
      <pattern id="kitchen-tile" width="55" height="55" patternUnits="userSpaceOnUse"><rect width="55" height="55" fill="#80654b"/><rect x="2" y="2" width="51" height="51" fill="#927456"/><path d="M8 8h39v39" fill="none" stroke="#c8a176" stroke-opacity=".18"/></pattern>
    </defs>
    <rect width="1600" height="1000" fill="url(#kitchen-wall)"/>
    <rect x="700" y="220" width="850" height="525" fill="url(#kitchen-tile)"/>
    <path d="M790 90h650l95 170H690Z" fill="#3e3329" stroke="#b48b5b" stroke-width="5"/>
    <path d="M950 90V0h300v90" fill="#514133"/><path d="M720 238h788" stroke="#c7a16d" stroke-width="3"/>
    <path d="M705 389h770" stroke="#48372a" stroke-width="12"/>
    <g fill="#bb8e58" stroke="#dec08a" stroke-width="3"><path d="M823 389v80q-70 80 0 112 70-32 0-112"/><path d="M982 389v91q-51 49 0 73 51-24 0-73"/><path d="M1150 389v120"/><ellipse cx="1150" cy="520" rx="37" ry="25"/></g>
    <ellipse cx="1100" cy="694" rx="400" ry="320" fill="url(#kitchen-fire)"/>
    <rect x="730" y="636" width="760" height="232" fill="#352a21" stroke="#a17c4e" stroke-width="5"/>
    <path d="M710 632h800v44H710Z" fill="#6a4a31"/><path d="M740 648h740" stroke="#c3a072" stroke-width="3"/>
    <rect x="845" y="686" width="490" height="128" rx="9" fill="#171b16"/>
    <g fill="#c96e36"><ellipse cx="894" cy="779" rx="28" ry="10"/><ellipse cx="969" cy="785" rx="34" ry="10"/><ellipse cx="1055" cy="778" rx="29" ry="11"/><ellipse cx="1140" cy="786" rx="38" ry="11"/><ellipse cx="1241" cy="779" rx="35" ry="10"/></g>
    <g fill="#e6b96b"><path d="M914 775q-29-21 0-62-9 44 14 48Z"/><path d="M1039 776q-20-45 22-91-23 56 3 80Z"/><path d="M1153 778q-26-32 11-74-15 45 12 60Z"/><path d="M1249 773q-22-20 0-51-3 26 12 41Z"/></g>
    <g stroke="#625a43" stroke-width="5"><path d="M863 712h453M863 733h453M863 754h453M889 698v94M932 698v94M977 698v94M1020 698v94M1066 698v94M1110 698v94M1155 698v94M1199 698v94M1244 698v94M1288 698v94"/></g>
    <path d="M718 866h785l60 134H650Z" fill="#5f4530"/><path d="M1040 869v131M1390 869l35 131M790 869l-30 131" stroke="#bd976033" stroke-width="2"/>
    <g transform="translate(1400 593)"><path d="M-40 0h80l-10 42h-60Z" fill="#a96341"/><path d="M0 0q-80-80-32-128Q9-47 0 0M0 0q63-112 85-64Q27-18 0 0M0 0q-23-138 15-129Q36-48 0 0" fill="#626e43"/></g>
    <path d="M0 0h670v1000H0Z" fill="#251f19" opacity=".35"/>
  </svg>`;
}
