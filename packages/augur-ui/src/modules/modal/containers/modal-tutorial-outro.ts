import { connect } from 'react-redux';
import { withRouter } from 'react-router-dom';
import { Onboarding } from 'modules/modal/onboarding';
import { closeModal } from 'modules/modal/actions/close-modal';
import { AppState } from 'store';
import { ThunkDispatch } from 'redux-thunk';
import { Action } from 'redux';
import makePath from 'modules/routes/helpers/make-path';
import { MARKETS } from 'modules/routes/constants/views';

const mapStateToProps = (state: AppState) => ({});

const mapDispatchToProps = (dispatch: ThunkDispatch<void, any, Action>) => ({
  closeModal: () => dispatch(closeModal()),
});

const mergeProps = (sP: any, dP: any, oP: any) => ({
  largeHeader: 'Congratulations on making your first test trade!',
  condensed: true,
  smallHeader:
    "Now you're all set! You can view this walkthrough at any time from the help menu (question mark icon on the top right). Additionally, our Knowledge Center is there to help you with more in depth guidance",
  buttons: [
    {
      text: 'Explore Augur Markets',
      action: () => {
        oP.history.push({
          pathname: makePath(MARKETS),
        });
        dP.closeModal();
      },
    },
    {
      text: 'View again',
      action: () => {
        oP.back();
        dP.closeModal();
      },
    },
  ],
});

export default withRouter(
  connect(
    mapStateToProps,
    mapDispatchToProps,
    mergeProps
  )(Onboarding)
);