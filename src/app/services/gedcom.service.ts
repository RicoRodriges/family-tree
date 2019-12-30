import {Injectable} from '@angular/core';
import {Tree} from '../model/tree';
import gedcom from 'parse-gedcom';
import {Person} from '../model/person';
import {Sex} from '../model/sex.enum';
import {GedDate} from '../model/ged-date';
import {Family} from '../model/family';

@Injectable({
  providedIn: 'root'
})
export class GedcomService {
  private static readonly delim = '\n';
  private static readonly dateMapper = {
    0: 'JAN',
    1: 'FEB',
    2: 'MAR',
    3: 'APR',
    4: 'MAY',
    5: 'JUN',
    6: 'JUL',
    7: 'AUG',
    8: 'SEP',
    9: 'OCT',
    10: 'NOV',
    11: 'DEC',
  };
  private static readonly header = `0 HEAD${GedcomService.delim}\
1 SOUR DMS®${GedcomService.delim}\
2 VERS 0.0.1${GedcomService.delim}\
2 CORP Dimon MAX Studio${GedcomService.delim}\
3 ADDR https://dmstudio.darkhost.pro${GedcomService.delim}\
1 DATE ${new Date().getDate()} ${GedcomService.dateMapper[new Date().getMonth()]} ${new Date().getFullYear()}${GedcomService.delim}\
1 SUBM @subm1@${GedcomService.delim}\
1 GEDC${GedcomService.delim}\
2 VERS 5.5${GedcomService.delim}\
2 FORM LINEAGE_LINKED${GedcomService.delim}\
1 CHAR UTF-8${GedcomService.delim}`;
  private static readonly footer = '0 TRLR';

  constructor() {
  }

  read(data: string): Tree {
    const tree = new Tree();
    const ged: any[] = gedcom.parse(data);
    const idMapper: IdMapper[] = [];
    ged.forEach((v) => {
      if (v.tag === 'INDI') {
        const newPerson = this.readPerson(v.tree);
        tree.indi.push(newPerson);
        idMapper.push(new IdMapper(v.pointer, newPerson.id));
      }
    });
    ged.forEach((v) => {
      if (v.tag === 'FAM') {
        tree.families.push(this.readFamily(v.tree, tree.indi, idMapper));
      }
    });
    return tree;
  }

  write(tree: Tree): string {
    let str = GedcomService.header;
    tree.indi.forEach((p) => {
      str += this.writePerson(p);
    });
    tree.families.forEach((f) => {
      str += this.writeFamily(f);
    });
    return str + GedcomService.footer;
  }

  private readPerson(data: any[]): Person {
    const res = new Person();
    const name = data
      .find((v) => v.tag === 'NAME');
    if (name) {
      this.resolveName(name, res);
    }
    const sex = data
      .find((v) => v.tag === 'SEX');
    if (sex) {
      res.sex = sex.data.trim().toUpperCase() === 'F' ? Sex.FEMALE : Sex.MALE;
    }
    const birt = data
      .find((v) => v.tag === 'BIRT');
    if (birt) {
      const date = birt.tree.find((v) => v.tag === 'DATE');
      if (date) {
        res.birthsday = this.resolveDate(date.data);
      }
    }
    const deat = data
      .find((v) => v.tag === 'DEAT');
    if (deat) {
      res.isAlive = false;
      const date = deat.tree.find((v) => v.tag === 'DATE');
      if (date) {
        res.death = this.resolveDate(date.data);
      }
    }
    return res;
  }

  private resolveName(data: any, p: Person) {
    // Name 1 / Surname / Name 2
    const regex = /([^\/]*)?\s*(\/([^\/]*)\/)?\s*(.*)?/;
    const match = regex.exec(data.data);
    if (match[1] || match[4]) {
      const name: string[] = [];
      if (match[1]) {
        name.push(match[1].trim());
      }
      if (match[4]) {
        name.push(match[4].trim());
      }
      p.name = name.join(' ');
    }
    if (match[3]) {
      p.surname = match[3].trim();
    }
  }

  private resolveDate(data: string): GedDate {
    data = data.replace(/(@#DHEBREW@)|(@#DROMAN@)|(@#DFRENCH R@)|(@#DGREGORIAN@)|(@#DJULIAN@)|(@#DUNKNOWN@)/, '');
    if (data.startsWith('INT ') || data.startsWith('ABT ') || data.startsWith('CAL ') || data.startsWith('EST ')) {
      data = data.slice(4);
    }
    if (data.startsWith('BEF ')) {
      const d = this.parseDate(data.slice(4));
      const res = new GedDate();
      res.lt = d;
      return res;
    }
    if (data.startsWith('AFT ')) {
      const d = this.parseDate(data.slice(4));
      const res = new GedDate();
      res.gt = d;
      return res;
    }
    if (data.startsWith('BET ')) {
      const reg = /^BET (.*) AND (.*)$/;
      const m = reg.exec(data);
      const res = new GedDate();
      res.gt = this.parseDate(m[1]);
      res.lt = this.parseDate(m[2]);
      return res;
    }
    if (data.startsWith('FROM ') || data.startsWith('TO ')) {
      const reg = /^(FROM ([^(TO)]+))?(TO (.+))?$/;
      const m = reg.exec(data);
      const res = new GedDate();
      res.gte = this.parseDate(m[2]);
      res.lte = this.parseDate(m[4]);
      return res;
    }
    const res = new GedDate();
    res.gte = this.parseDate(data);
    res.lte = res.gte;
    return res;
  }

  private parseDate(data: string): Date {
    if (data) {
      const fullDate = /^(\d{1,2}) ([^ ]+) (\d{4})/;
      if (fullDate.test(data.trim())) {
        const match = fullDate.exec(data.trim());
        return new Date(match[0]);
      }
      const monthDate = /^([^ ]+) (\d{4})/;
      if (monthDate.test(data.trim())) {
        const match = monthDate.exec(data.trim());
        return new Date('1 ' + match[1] + ' ' + match[2]);
      }
      const year = /^(\d{4})/;
      if (year.test(data.trim())) {
        const match = year.exec(data.trim());
        return new Date('1 JAN ' + match[1]);
      }
    }
    return null;
  }

  private readFamily(tree: any[], indi: Person[], idMapper: IdMapper[]) {
    let pHusb: Person;
    let pWife: Person;
    const pChilds: Person[] = [];
    const res = new Family();
    const married = tree.find((v) => v.tag === 'MARR') !== undefined;
    const husb = tree.find((v) => v.tag === 'HUSB');
    if (husb) {
      const p = idMapper.find((v) => v.gedId === husb.data);
      if (p) {
        pHusb = indi.find((v) => v.id === p.id);
      }
    }
    const wife = tree.find((v) => v.tag === 'WIFE');
    if (wife) {
      const p = idMapper.find((v) => v.gedId === wife.data);
      if (p) {
        pWife = indi.find((v) => v.id === p.id);
      }
    }
    tree.filter((v) => v.tag === 'CHIL')
      .map((c) => idMapper.find((v) => v.gedId === c.data))
      .filter((c) => c)
      .map((c) => indi.find((v) => v.id === c.id))
      .filter((c) => c)
      .forEach((c) => pChilds.push(c));
    res.husband = pHusb;
    res.wife = pWife;
    res.children = pChilds;
    res.married = married;
    if (pHusb) {
      pHusb.families.push(res);
    }
    if (pWife) {
      pWife.families.push(res);
    }
    pChilds.forEach((c) => {
      c.familyChild = res;
    });
    return res;
  }

  private writePerson(p: Person) {
    const str = [`0 @I${p.id}@ INDI`];
    if (p.name || p.surname) {
      const name: string[] = [];
      if (p.name) {
        name.push(p.name);
      }
      if (p.surname) {
        name.push(`/${p.surname}/`);
      }
      str.push(`1 NAME ${name.join(' ')}`);
    }
    if (p.sex !== null && p.sex !== undefined) {
      str.push(`1 SEX ${p.sex === Sex.FEMALE ? 'F' : 'M'}`);
    }
    const birthsday = this.writeDate(p.birthsday);
    if (birthsday) {
      str.push('1 BIRT');
      str.push(`2 DATE ${birthsday}`);
    }
    if (!p.isAlive) {
      str.push('1 DEAT');
      const death = this.writeDate(p.death);
      if (death) {
        str.push(`2 DATE ${death}`);
      }
    }
    if (p.familyChild) {
      str.push(`1 FAMC @F${p.familyChild.id}@`);
    }
    if (p.families.length > 0) {
      p.families.forEach((f) => {
        str.push(`1 FAMS @F${f.id}@`);
      });
    }
    return str.map((v) => v + GedcomService.delim).join('');
  }

  private writeDate(date: GedDate) {
    if (date) {
      if (date.lte && date.lte === date.gte) {
        return this.dateToStr(date.lte);
      }
      if (date.lt && !date.lte && !date.gte && !date.gt) {
        return `BEF ${this.dateToStr(date.lt)}`;
      }
      if (!date.lt && !date.lte && !date.gte && date.gt) {
        return `AFT ${this.dateToStr(date.gt)}`;
      }
      if (date.lt && !date.lte && !date.gte && date.gt) {
        return `BET ${this.dateToStr(date.gt)} AND ${this.dateToStr(date.lt)}`;
      }
      if (!date.lt && (date.lte || date.gte) && !date.gt) {
        const str = [];
        if (date.gte) {
          str.push(`FROM ${this.dateToStr(date.gte)}`);
        }
        if (date.lte) {
          str.push(`TO ${this.dateToStr(date.lte)}`);
        }
        return str.join(' ');
      }
    }
    return null;
  }

  private dateToStr(date: Date) {
    return date.getDate() + ' ' + GedcomService.dateMapper[date.getMonth()] + ' ' + date.getFullYear();
  }

  private writeFamily(f: Family) {
    const str = [`0 @F${f.id}@ FAM`];
    if (f.husband) {
      str.push(`1 HUSB @I${f.husband.id}@`);
    }
    if (f.wife) {
      str.push(`1 WIFE @I${f.wife.id}@`);
    }
    if (f.children.length > 0) {
      f.children.forEach((c) => {
        str.push(`1 CHIL @I${c.id}@`);
      });
    }
    if (f.married) {
      str.push('1 MARR');
    }
    return str.map((v) => v + GedcomService.delim).join('');
  }
}

class IdMapper {
  gedId: string;
  id: number;

  constructor(gedId: string, id: number) {
    this.gedId = gedId;
    this.id = id;
  }
}
