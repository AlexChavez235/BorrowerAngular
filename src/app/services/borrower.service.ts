import { Injectable, Inject } from '@angular/core';
import { SESSION_STORAGE, WebStorageService } from 'angular-webstorage-service';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Subject } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../environments/environment';


@Injectable({
  providedIn: 'root'
})
export class BorrowerService {


  constructor(private http: HttpClient, @Inject(SESSION_STORAGE) private storage: WebStorageService) {
    let storedData = {
      "_id": null,
      "name": null,
      "phone": null,
      "address": null
    };

    //check session data for active borrower
    storedData._id = this.storage.get("borrower._id");
    storedData.name = this.storage.get("borrower.name");
    storedData.phone = this.storage.get("borrower.phone");
    storedData.address = this.storage.get("borrower.address");

    if (storedData._id && storedData.name) {
      this.setBorrower(storedData);
    }
  }

  // borrower object
  borrower = {
    _id: null,
    name: null,
    phone: null,
    address: null
  };
  private loansUpdated = new Subject();

  // use .getValue() to get the boolean and .next('newinput') to change it
  loggedIn: BehaviorSubject<boolean> = new BehaviorSubject(false);

  isLoggedIn() {
    return this.loggedIn.getValue();
  }

  setLoggedIn(input: boolean) {
    this.loggedIn.next(input);
  }

  // gets borrower info from api
  establishBorrower(inputId) {
    return this.http.get(`${environment.apiUrl}/borrowers/${inputId}`);
  }

  // registers new borrower and returns the promise of a new borrower
  registerBorrower(newBorrower) {
    return this.http.post(environment.apiUrl + '/borrowers', newBorrower);
  }

  // gets active borrower
  getBorrower() {
    return this.borrower;
  }

  // sets the new active borrower
  setBorrower(newBorrower) {
    this.borrower = newBorrower;
    this.loggedIn.next(true);
    this.storage.set("borrower._id", this.borrower._id);
    this.storage.set("borrower.name", this.borrower.name);
    this.storage.set("borrower.phone", this.borrower.phone);
    this.storage.set("borrower.address", this.borrower.address);
  }

  // gets all the loans belonging to this borrower that have not been checked out
  getLoans(loansPerPage: number, currentPage: number) {
    const queryParams = `?pagesize=${loansPerPage}&page=${currentPage}`;
    this.http.get<{ loans: any[], numLoans: number }>(environment.apiUrl + `/borrowers/${this.borrower._id}/loans${queryParams}`)
      .pipe(map((loanData) => {
        return {
          loans: loanData.loans.map(loan => {
            return {
              id: loan._id,
              book: loan.book.title,
              branch: loan.branch.name,
              dateOut: new Date(loan.dateOut),
              dateDue: new Date(loan.dateDue),
              pastDue: (new Date(loan.dateDue) < new Date())
            };
          }), numLoans: loanData.numLoans
        };
      }))
      .subscribe(newLoanData => {
        this.loansUpdated.next({
          loans: [...newLoanData.loans],
          numLoans: newLoanData.numLoans
        });
      });
  }

  getLoansUpdateListener() {
    return this.loansUpdated.asObservable();
  }

  returnBook(loanId: string) {
    return this.http.put(environment.apiUrl + '/loans', { loanId });
  }

  get(url) {
    return this.http.get(environment.apiUrl + url);
  }

  query(url, query) {
    url = environment.apiUrl + url;
    if (query && query.length) {
      let entry = Object.entries(query[0])[0];
      url += `?${entry[0]}=${entry[1]}`;
    }
    for (let i = 1; i < query.length; i++) {
      let entry = Object.entries(query[i])[0];
      url += `&${entry[0]}=${entry[1]}`;
    }
    return this.http.get(url);
  }

  post(url, obj) {
    return this.http.post(environment.apiUrl + url, obj);
  }

  // logout function
  logout() {
    this.setBorrower({
      _id: null,
      name: null,
      phone: null,
      address: null
    });
    this.loggedIn.next(false);
    this.storage.set("borrower._id", null);
    this.storage.set("borrower.name", null);
    this.storage.set("borrower.phone", null);
    this.storage.set("borrower.address", null);
  }
}
