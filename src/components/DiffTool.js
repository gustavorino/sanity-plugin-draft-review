import { omit } from "lodash";
import sanityClient from "part:@sanity/base/client";
import { getDraftId, getPublishedId } from "part:@sanity/base/util/draft-utils";
import Button from "part:@sanity/components/buttons/anchor";
import { default as React, PureComponent } from "react";
import { of as observableOf } from "rxjs";
import { catchError, map } from "rxjs/operators";
import Diff from "./Diff";

const clean = obj => {
  const { _id, _rev, _updatedAt, ...rest } = obj;
  return rest;
};

export default class DiffTool extends PureComponent {
  state = { drafts: [], docs: [], loading: true };

  constructor() {
    super();
    this.loadData();
  }

  loadData = () => {
    this.setState({ drafts: [], docs: [], loading: true });
    sanityClient.fetch(`*[_id in path("drafts.**")]`).then(drafts => {
      this.setState({ drafts });
      this.fetchDocs(drafts);
    });
  };

  fetchDocs(drafts) {
    const ids = drafts.map(draft => draft._id.replace("drafts.", ""));

    sanityClient.fetch(`*[_id in $ids]`, { ids }).then(data => {
      this.setState({ docs: data, loading: false });
    });
  }

  approve(draft, published) {
    const tx = sanityClient.observable.transaction();

    const documentId = draft._id;
    tx.patch(getPublishedId(documentId), {
      unset: ["_reserved_prop_"],
      ifRevisionID: published._rev
    }).createOrReplace({
      ...omit(draft, "_updatedAt"),
      _id: getPublishedId(documentId)
    });

    tx.delete(getDraftId(documentId));

    tx.commit()
      .pipe(
        map(result => ({
          type: "success",
          result: result
        })),
        catchError(error =>
          observableOf({
            type: "error",
            message:
              "An error occurred while attempting to publishing document",
            error
          })
        )
      )
      .subscribe({
        next: result => {
          this.setState({
            transactionResult: result
          });
        },
        complete: () => {
          this.loadData();
        }
      });
  }
  reject(draft) {
    sanityClient.delete(draft._id).then(() => {
      this.loadData();
    });
  }
  renderDiffs() {
    return this.state.docs.map((doc, i) => {
      const draft = this.state.drafts[i];
      return (
        <div key={i}>
          <h1>{draft._type}</h1>
          <Diff inputA={clean(doc)} inputB={clean(draft)} type="json" />
          <Button onClick={this.approve.bind(this, draft, doc)}>Approve</Button>
          <Button onClick={this.reject.bind(this, draft, doc)}>Reject</Button>
          <Button href={`desk/${doc._type};${doc._id}`}>View</Button>
        </div>
      );
    });
  }

  renderOptions() {
    if (this.state.loading) {
      return <h2>Loading...</h2>;
    }
    if (this.state.drafts.length == 0) {
      return <h2>Draft list is empty</h2>;
    }
    return <div>{this.renderDiffs()}</div>;
  }
  render() {
    return <div style={{ margin: 20 }}>{this.renderOptions()}</div>;
  }
}
