import {Component, EventEmitter, Input, OnInit, Output} from '@angular/core';

@Component({
  selector: 'app-nav-bar',
  templateUrl: './nav-bar.component.html',
  styleUrls: ['./nav-bar.component.css']
})
export class NavBarComponent implements OnInit {
  @Input() siteName: string;
  @Input() pages: string[];
  @Input() currentPage: string;
  @Output() pageChange = new EventEmitter<string>();
  showMenu = false;

  constructor() { }

  ngOnInit() {
  }

  onChange(e: Event, pageName: string) {
    e.preventDefault();
    this.pageChange.emit(pageName);
  }

}
