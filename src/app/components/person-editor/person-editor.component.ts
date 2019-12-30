import {Component, EventEmitter, Input, Output} from '@angular/core';
import {Person} from '../../model/person';
import {Sex} from '../../model/sex.enum';
import {Tree} from '../../model/tree';
import {TreeResolverService} from '../../services/tree-resolver.service';

@Component({
  selector: 'app-person-editor',
  templateUrl: './person-editor.component.html',
  styleUrls: ['./person-editor.component.css']
})
export class PersonEditorComponent {
  person: Person;
  @Input() tree: Tree;
  @Output() back = new EventEmitter<void>();
  @Output() changePerson = new EventEmitter<Person>();
  mother?: Person = null;
  father?: Person = null;
  brothers: Person[] = [];
  spouses: Person[] = [];
  children: Person[] = [];
  choosePerson = false;
  afterChoose: (Person) => void = null;
  filter: (Tree) => Person[] = null;
  createMale = true;
  chooseTitle: string = null;

  readonly SEX_MAPPER = [{n: 'Мужчина', v: Sex.MALE}, {n: 'Женщина', v: Sex.FEMALE}];

  constructor(private treeResolver: TreeResolverService) {
  }

  @Input('person')
  set _person(p: Person) {
    this.person = p;
    this.recreate();
  }

  private recreate() {
    this.mother = null;
    this.father = null;
    this.brothers = [];
    this.spouses = [];
    this.children = [];
    if (this.person.familyChild) {
      if (this.person.familyChild.wife) {
        this.mother = this.person.familyChild.wife;
      }
      if (this.person.familyChild.husband) {
        this.father = this.person.familyChild.husband;
      }
      if (this.person.familyChild.children && this.person.familyChild.children.length > 1) {
        this.brothers = this.person.familyChild.children.filter((p) => p.id !== this.person.id);
      }
    }
    if (this.person.families.length > 0) {
      this.person.families.filter((f) => f.married)
        .map((f) => [f.husband, f.wife].filter((v) => v && v.id !== this.person.id))
        .filter((c) => c.length > 0)
        .forEach((c) => {
          this.spouses = this.spouses.concat(c);
        });
      this.person.families.map((f) => f.children)
        .filter((c) => c && c.length > 0)
        .forEach((c) => {
          this.children = this.children.concat(c);
        });
    }
  }

  onBack() {
    if (!this.choosePerson) {
      this.back.emit();
    } else {
      this.choosePerson = false;
      this.filter = null;
      this.afterChoose = null;
      this.chooseTitle = null;
    }
  }

  onPersonChange(p: Person) {
    this.changePerson.emit(p);
  }

  deleteMother() {
    this.treeResolver.deleteMother(this.tree, this.person);
    this.recreate();
  }

  deleteFather() {
    this.treeResolver.deleteFather(this.tree, this.person);
    this.recreate();
  }

  changeMother() {
    this.choosePerson = true;
    this.createMale = false;
    this.filter = (t: Tree) => t.indi.filter((p) => p.id !== this.person.id &&
      (!this.person.familyChild || ((!this.person.familyChild.wife || this.person.familyChild.wife.id !== p.id) &&
        (!this.person.familyChild.husband || this.person.familyChild.husband.id !== p.id))) &&
      !this.person.families.some((f) => f.wife === p || f.husband === p || f.children.some((c) => c.id === p.id)));
    this.afterChoose = (m) => this.treeResolver.addMother(this.tree, this.person, m);
    this.chooseTitle = 'Выберите или создайте мать';
  }

  changeFather() {
    this.choosePerson = true;
    this.createMale = true;
    this.filter = (t: Tree) => t.indi.filter((p) => p.id !== this.person.id &&
      (!this.person.familyChild || ((!this.person.familyChild.wife || this.person.familyChild.wife.id !== p.id) &&
        (!this.person.familyChild.husband || this.person.familyChild.husband.id !== p.id))) &&
      !this.person.families.some((f) => f.wife === p || f.husband === p || f.children.some((c) => c.id === p.id)));
    this.afterChoose = (f) => this.treeResolver.addFather(this.tree, this.person, f);
    this.chooseTitle = 'Выберите или создайте отца';
  }

  addSpouse() {
    this.choosePerson = true;
    this.createMale = this.person.sex !== Sex.MALE;
    this.filter = (t: Tree) => t.indi.filter((p) => p.id !== this.person.id &&
      (!this.person.familyChild || ((!this.person.familyChild.wife || this.person.familyChild.wife.id !== p.id) &&
        (!this.person.familyChild.husband || this.person.familyChild.husband.id !== p.id))) &&
      !this.person.families.some((f) => f.children.some((c) => c.id === p.id)));
    this.afterChoose = (s) => this.treeResolver.addSpouse(this.tree, this.person, s);
    this.chooseTitle = 'Выберите или создайте супруга';
  }

  selected(p: Person) {
    this.afterChoose(p);
    this.choosePerson = false;
    this.afterChoose = null;
    this.recreate();
  }

  added() {
    const p = this.treeResolver.createPerson(this.tree, this.createMale);
    this.selected(p);
    this.onPersonChange(p);
  }

  deleteSpouse(s: Person) {
    this.treeResolver.deleteSpouse(this.tree, this.person, s);
    this.recreate();
  }

  deletePerson() {
    this.treeResolver.deletePerson(this.tree, this.person);
    this.onBack();
  }
}
