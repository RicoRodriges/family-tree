import {Component, EventEmitter, Input, OnInit, Output} from '@angular/core';
import {Tree} from '../../model/tree';
import {Person} from '../../model/person';

@Component({
  selector: 'app-person-list',
  templateUrl: './person-list.component.html',
  styleUrls: ['./person-list.component.css']
})
export class PersonListComponent implements OnInit {
  @Input() persons: Person[];
  @Output() personChange = new EventEmitter<Person>();
  @Output() personAdd = new EventEmitter<void>();

  constructor() {
  }

  ngOnInit() {
  }

  onChange(p: Person) {
    this.personChange.emit(p);
  }

  onCreate() {
    this.personAdd.emit();
  }
}
