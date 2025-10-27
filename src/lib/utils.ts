import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function toUrduName(name: string): string {
  if (!name) return name
  const hasUrdu = /[\u0600-\u06FF]/.test(name)
  if (hasUrdu) return name
  const lower = name.trim().toLowerCase()

  const dictionary: Record<string, string> = {
    haris: "حارث",
    harris: "حارث",
    muhammad: "محمد",
    mohammad: "محمد",
    ahmad: "احمد",
    ahmed: "احمد",
    ali: "علی",
    ayesha: "عائشہ",
    aisha: "عائشہ",
    fatima: "فاطمہ",
    hassan: "حسن",
    husain: "حسین",
    hussain: "حسین",
    usman: "عثمان",
    abdullah: "عبداللہ",
    zain: "زین",
    umair: "عمیر",
    umar: "عمر",
    omer: "عمر",
    yousuf: "یوسف",
    yusuf: "یوسف",
    sara: "سارہ",
    salman: "سلمان",
    bilal: "بلال",
    kashif: "کاشف",
  }

  const transliterateToken = (token: string): string => {
    const t = token.toLowerCase()
    if (dictionary[t]) return dictionary[t]

    const digraphs: Record<string, string> = {
      sh: "ش",
      ch: "چ",
      kh: "خ",
      gh: "غ",
      ph: "ف",
      th: "تھ",
      dh: "دھ",
      zh: "ژ",
    }

    let out = ""
    for (let i = 0; i < t.length; i++) {
      const pair = t.slice(i, i + 2)
      if (digraphs[pair]) {
        out += digraphs[pair]
        i++
        continue
      }
      const c = t[i]
      const map: Record<string, string> = {
        a: "ا",
        b: "ب",
        c: "ک",
        d: "د",
        e: "ے",
        f: "ف",
        g: "گ",
        h: "ہ",
        i: "ی",
        j: "ج",
        k: "ک",
        l: "ل",
        m: "م",
        n: "ن",
        o: "و",
        p: "پ",
        q: "ق",
        r: "ر",
        s: "س",
        t: "ت",
        u: "و",
        v: "و",
        w: "و",
        x: "کس",
        y: "ی",
        z: "ز",
        " ": " ",
        "-": "-",
      }
      out += map[c] ?? c
    }
    return out
  }

  const tokens = lower.split(/\s+/)
  return tokens.map(transliterateToken).join(" ")
}
