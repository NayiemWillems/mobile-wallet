import {Component, NgZone, OnDestroy, ViewChild} from '@angular/core';
import {ModalController, NavController, Platform, IonSlides, IonSearchbar} from '@ionic/angular';
import {Wallet} from '@/models/wallet';
import {Delegate, Network} from 'ark-ts';
import {ArkApiProvider} from '@/services/ark-api/ark-api';
import {UserDataProvider} from '@/services/user-data/user-data';
import {ToastProvider} from '@/services/toast/toast';
import * as constants from '@/app/app.constants';
import {Subject} from 'rxjs';
import { TopWalletDetailsPage } from './modal/top-wallet-details/top-wallet-details';
import { tap, takeUntil } from 'rxjs/operators';

@Component({
  selector: 'page-wallet-top-list',
  templateUrl: 'wallet-top-list.html',
  styleUrls: ['wallet-top-list.scss'],
})
export class WalletTopListPage implements OnDestroy {
  @ViewChild('topWalletSlider', { read: IonSlides, static: true })
  slider: IonSlides;

  @ViewChild('searchbar', { read: IonSearchbar, static: true })
  searchbar: IonSearchbar;

  public network: Network;
  public isSearch = false;
  public searchQuery = '';

  public topWallets: Wallet[] = [];

  private currentWallet: Wallet;
  private currentPage = 1;

  private unsubscriber$: Subject<void> = new Subject<void>();
  private refreshListener;

  constructor(
    public platform: Platform,
    public navCtrl: NavController,
    private arkApiProvider: ArkApiProvider,
    private zone: NgZone,
    private modalCtrl: ModalController,
    private userDataProvider: UserDataProvider,
    private toastProvider: ToastProvider,
  ) {
    this.network = this.userDataProvider.currentNetwork;
  }

  async openDetailModal(wallet: Wallet) {
    const modal = await this.modalCtrl.create({
      component: TopWalletDetailsPage,
      componentProps: {
        wallet
      },
      showBackdrop: true,
      backdropDismiss: true
    });

    modal.present();
  }

  toggleSearchBar() {
    this.isSearch = !this.isSearch;
    if (this.isSearch) {
      setTimeout(() => {
        this.searchbar.setFocus();
      }, 100);
    }
  }

  onUpdateTopWallets() {
    this.arkApiProvider.onUpdateTopWallets$
      .pipe(
        takeUntil(this.unsubscriber$),
        tap((topWallets) => {
          this.zone.run(() => {
            topWallets.forEach(wallet => {
              this.topWallets.push(wallet);
            });
          });
        })
      )
      .subscribe();
  }

  ionViewDidEnter() {
    this.currentWallet = this.userDataProvider.currentWallet;

    this.onUpdateTopWallets();
    this.arkApiProvider.fetchTopWallets(constants.TOP_WALLETS_TO_FETCH, this.currentPage).subscribe();
  }

  ngOnDestroy() {
    clearInterval(this.refreshListener);

    this.unsubscriber$.next();
    this.unsubscriber$.complete();
  }

  getBalance(balance: string) {
    return Number(balance) / constants.WALLET_UNIT_TO_SATOSHI;
  }

  fetchWallets(infiniteScroll) {
    this.currentPage++;
    this.arkApiProvider.fetchTopWallets(constants.TOP_WALLETS_TO_FETCH, this.currentPage).subscribe(() => {
      infiniteScroll.complete();
    });
  }
}
