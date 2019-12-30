import {Component, ElementRef, EventEmitter, ViewChild} from '@angular/core';
import {FileService} from './services/file.service';
import {GedcomService} from './services/gedcom.service';
import {Tree} from './model/tree';
import {TreeResolverService} from './services/tree-resolver.service';
import {NgbModal} from '@ng-bootstrap/ng-bootstrap';
import {Person} from './model/person';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  @ViewChild('infoModal', {static: false}) infoModal: ElementRef;
  siteName = 'Генеалогическое древо';
  navBarOptions = ['Импорт из GEDCOM', 'Экспорт в GEDCOM', 'Справка'];
  onShakeEvent: EventEmitter<void> = new EventEmitter();
  familyTree?: Tree;
  selectedPerson?: Person;
  familyTreeForDraw?: Tree;

  constructor(private fileService: FileService,
              private gedcomService: GedcomService,
              private treeResolverService: TreeResolverService,
              private modalService: NgbModal) {
    this.familyTree = new Tree();
    this.familyTreeForDraw = this.familyTree;
  }

  upload() {
    this.fileService.uploadText()
      .then((t) => {
        this.familyTree = this.gedcomService.read(t);
        this.drawTree();
      });
  }

  drawTree() {
    const tree = new Tree();
    tree.indi = this.familyTree.indi;
    tree.families = this.familyTree.families;
    this.familyTreeForDraw = tree;
  }

  download() {
    this.fileService.download(this.gedcomService.write(this.familyTree), 'my.ged');
  }

  openInfoModal() {
    this.modalService.open(this.infoModal, {scrollable: true});
  }

  onPersonSelect(pId: number) {
    const person = this.familyTree.indi.find((p) => p.id === pId);
    if (person) {
      this.selectedPerson = person;
    }
  }

  onPersonAdd() {
    this.selectedPerson = this.treeResolverService.createPerson(this.familyTree, true);
  }

  onNavBarChange(selectedOption: string) {
    const selectedOptionIndex = this.navBarOptions.indexOf(selectedOption);
    switch (selectedOptionIndex) {
      case 0:
        this.upload();
        break;
      case 1:
        this.download();
        break;
      case 2:
        this.openInfoModal();
        break;
    }
  }

  // @HostListener('window:beforeunload', ['$event'])
  // public beforeunloadHandler($event) {
  //   $event.returnValue = 'Are you sure?';
  //   return $event.returnValue;
  // }

}
