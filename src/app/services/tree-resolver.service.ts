import {Injectable} from '@angular/core';
import {Tree} from '../model/tree';
import {Sex} from '../model/sex.enum';
import {GedDate} from '../model/ged-date';
import {Person} from '../model/person';
import {Family} from '../model/family';

@Injectable({
  providedIn: 'root'
})
export class TreeResolverService {

  constructor() {
  }

  createPerson(tree: Tree, isMale: boolean) {
    // const id = (tree.indi.length ? Math.max(...tree.indi.map((p) => p.id)) : 0) + 1;
    const person = new Person();
    if (!isMale) {
      person.sex = Sex.FEMALE;
    } else {
      person.sex = Sex.MALE;
    }
    tree.indi.push(person);
    return person;
  }

  buildNodes(tree: Tree): TreeNode[] {
    return tree.indi.map((p) => {
      const o = new TreeNode();
      o.id = p.id;
      o.name = p.name;
      o.surname = p.surname;
      // const dates = [p.birthsday, p.death].map((d) => this.toDateString(d)).filter((d) => d).join(' - ');
      let dates = this.toDateString(p.birthsday) || '?';
      if (!p.isAlive) {
        dates += ' - ' + (this.toDateString(p.death) || '?');
      }
      // [p.birthsday, p.death].map((d) => this.toDateString(d)).filter((d) => d).join(' - ');
      o.dates = `(${dates})`;
      o.s = (p.sex !== undefined && p.sex !== null) ? ((p.sex === Sex.FEMALE) ? 'F' : 'M') : undefined;
      o.m = (p.familyChild && p.familyChild.wife) ? p.familyChild.wife.id : undefined;
      o.f = (p.familyChild && p.familyChild.husband) ? p.familyChild.husband.id : undefined;
      o.marr = [];
      if (p.families) {
        p.families.map((f) => [f.husband, f.wife].filter((v) => v && v.id !== p.id).map((v) => v.id))
          .filter((v) => v.length > 0)
          .forEach((v) => {
            o.marr = o.marr.concat(v);
          });
      }
      return o;
    });
  }

  // TODO
  private toDateString(d: GedDate) {
    const date = d.lt || d.gt || d.lte || d.gte;
    if (date) {
      return date.getDate() + '.' + (date.getMonth() + 1) + '.' + date.getFullYear();
    }
  }

  findFamily(tree: Tree, w: Person, h: Person) {
    return tree.families.find((f) => f.wife === w && f.husband === h);
  }

  createFamily(tree: Tree, w: Person, h: Person) {
    const family = this.findFamily(tree, w, h);
    if (family) {
      return family;
    } else {
      const newFamily = new Family();
      newFamily.husband = h;
      newFamily.wife = w;
      if (h) {
        h.families.push(newFamily);
      }
      if (w) {
        w.families.push(newFamily);
      }
      tree.families.push(newFamily);
      return newFamily;
    }
  }

  deleteMother(tree: Tree, person: Person) {
    const family = person.familyChild;
    if (family) {
      const m = family.wife;
      if (m) {
        if (family.children) {
          family.children = family.children.filter((v) => v.id !== person.id);
        }
        const f = family.husband;
        if (f) {
          const newFamily = this.createFamily(tree, null, f);
          newFamily.children.push(person);
          person.familyChild = newFamily;
        } else if (family.children.length === 0) {
          person.familyChild = null;
          m.families = m.families.filter((v) => v !== family);
          tree.families = tree.families.filter((v) => v !== family);
        }
      }
    }
  }

  deleteFather(tree: Tree, person: Person) {
    const family = person.familyChild;
    if (family) {
      const f = family.husband;
      if (f) {
        if (family.children) {
          family.children = family.children.filter((v) => v.id !== person.id);
        }
        const m = family.wife;
        if (m) {
          const newFamily = this.createFamily(tree, m, null);
          newFamily.children.push(person);
          person.familyChild = newFamily;
        } else if (family.children.length === 0) {
          person.familyChild = null;
          f.families = f.families.filter((v) => v !== family);
          tree.families = tree.families.filter((v) => v !== family);
        }
      }
    }
  }

  addMother(tree: Tree, person: Person, mother: Person) {
    const family = person.familyChild;
    if (family) {
      if (!family.wife) {
        if (family.children.length === 1) {
          family.wife = mother;
          mother.families.push(family);
        } else {
          family.children = family.children.filter((v) => v.id !== person.id);
          const newFamily = this.createFamily(tree, mother, family.husband);
          newFamily.children.push(person);
          person.familyChild = newFamily;
        }
      } else {
        throw new Error('Person already has a mother');
      }
    } else {
      const newFamily = this.createFamily(tree, mother, null);
      newFamily.children.push(person);
      person.familyChild = newFamily;
    }
  }

  addFather(tree: Tree, person: Person, father: Person) {
    const family = person.familyChild;
    if (family) {
      if (!family.husband) {
        if (family.children.length === 1) {
          const existFamily = this.findFamily(tree, family.wife, father);
          if (existFamily) {
            existFamily.children.push(person);
            person.familyChild = existFamily;
            this.deleteFamily(tree, family);
          } else {
            family.husband = father;
            father.families.push(family);
          }
        } else {
          family.children = family.children.filter((v) => v.id !== person.id);
          const newFamily = this.createFamily(tree, family.wife, father);
          newFamily.children.push(person);
          person.familyChild = newFamily;
        }
      } else {
        throw new Error('Person already has a father');
      }
    } else {
      const newFamily = this.createFamily(tree, null, father);
      newFamily.children.push(person);
      person.familyChild = newFamily;
    }
  }

  deleteSpouse(tree: Tree, p: Person, s: Person) {
    p.families.filter((f) => f.husband && f.wife)
      .filter((f) => f.husband.id === s.id || f.wife.id === s.id)
      .forEach((f) => {
        if (f.children.length === 0) {
          this.deleteFamily(tree, f);
        } else {
          f.married = false;
        }
      });
  }

  deleteFamily(tree: Tree, f: Family) {
    tree.families = tree.families.filter((v) => v.id !== f.id);
    if (f.husband) {
      f.husband.families = f.husband.families.filter((v) => v.id !== f.id);
    }
    if (f.wife) {
      f.wife.families = f.wife.families.filter((v) => v.id !== f.id);
    }
  }

  addSpouse(tree: Tree, p: Person, s: Person) {
    const families = tree.families.filter((f) => f.wife && f.husband)
      .filter((f) => f.husband.id === p.id && f.wife.id === s.id || f.husband.id === s.id && f.wife.id === p.id);
    if (families.length > 0) {
      families.forEach((f) => f.married = true);
    } else {
      const args = [p, s]
        .sort((p1, p2) => p1.sex === p2.sex ? 0 : (p1.sex === Sex.FEMALE ? -1 : (p2.sex === Sex.FEMALE ? 1 : 0)));
      // @ts-ignore
      const newFamily = this.createFamily(tree, ...args);
      newFamily.married = true;
    }
  }

  deletePerson(tree: Tree, p: Person) {
    if (p.familyChild) {
      p.familyChild.children = p.familyChild.children.filter((c) => c.id !== p.id);
    }
    if (p.families.length > 0) {
      p.families.forEach((f) => {
        if (f.wife && f.wife.id === p.id) {
          f.wife = null;
        }
        if (f.husband && f.husband.id === p.id) {
          f.husband = null;
        }
        if (f.children.length === 0) {
          if (!f.wife || !f.husband) {
            (f.wife || f.husband).families = (f.wife || f.husband).families.filter((f2) => f2.id !== f.id);
            f.husband = null;
            f.wife = null;
          }
        } else {
          if (!f.wife && !f.husband) {
            f.children.forEach((c) => {
              c.familyChild = null;
            });
            f.children = [];
          }
        }
      });
    }
    tree.indi = tree.indi.filter((i) => i.id !== p.id);
    tree.families = tree.families.filter((f) => {
      return f.children.length > 0 || f.wife || f.husband;
    });
  }
}

export class TreeNode {
  id: number;
  name: string;
  surname: string;
  dates: string;
  s: string;
  m: number;
  f: number;
  marr: number[];
}
